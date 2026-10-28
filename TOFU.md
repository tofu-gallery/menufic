# Tofu gallery copy

This repository is Tofu's copy of **kaje94/menufic** (licence: MIT), listed in Tofu's app gallery as **Menufic**, a
QR-code menu for a small restaurant: the owner builds the menu (menus such as Dinner and Lunch, their categories, dishes
with prices, descriptions and photos), publishes it, and prints the QR code it makes. Guests scan the code on the table
and read the menu on their phone, with no app and no sign-in.

- `main` mirrors the upstream repository and is never committed to by Tofu.
- `tofu` carries Tofu's own changes; tags named `pin/<date>` mark the versions the gallery points to.
- A visitor who chooses this app gets a private snapshot of the pinned version in their own Tofu account. Their copy
  does not follow upstream updates.

Upstream: https://github.com/kaje94/menufic at `5438f133646e2764f35e251d8021d64595547dac` (2024-10-11, "fix: :bug: fix
docker build failures"), the head of its `main` when this copy was made.

## How Tofu runs it

- **Preset** `nextjs` (Next.js 13.1, pages router, tRPC, NextAuth 4, Prisma 4.13 with the 5.1.1 engine, Mantine 5), on
  Tofu's server hosting. **Root folder**: the repository root. The `Dockerfile` and `docker-compose.yml` at the root are
  upstream's own and are not used: Tofu's detector answers `container` because of them, and the gallery sets `nextjs`.
- **Install**: `npm install` from `package-lock.json`; its `postinstall` runs `patch-package` (one type patch for
  `@mantine/styles`, in `patches/`) and `prisma generate`. **Build**: `npm run build` (`next build`, which also lints and
  type-checks). **Output**: `.next`. Nothing migrates at install, build or start.
- **Database**: the copy's managed PostgreSQL. Tofu saves `DATABASE_URL` (the transaction pooler, port 6543,
  `sslmode=require`) and `SUPABASE_CA_CERT` (the server's root certificate) on the app.
- **Schema**: `supabase/migrations/`, which Tofu applies before each build, one transaction per file. The schema is made
  before the first build, never at start, so the several processes Tofu starts at once find it made and do nothing to it.
- **Settings**: `NEXT_PUBLIC_PROD_URL`, the copy's own address, saved before the first deploy (the pages' link previews
  name it). `MENUFIC_ADMIN_PASSWORD`, the owner's password, is a hidden value only the owner saves (below). Nothing else
  needs to be set: the session secret is derived (below), and NextAuth takes the address from the request on Vercel,
  where Tofu runs it (`VERCEL` is set there; elsewhere set `NEXTAUTH_URL`, or `AUTH_TRUST_HOST=true` behind a proxy).
  The optional limits `NEXT_PUBLIC_MAX_RESTAURANTS_PER_USER` (5), `NEXT_PUBLIC_MAX_MENUS_PER_RESTAURANT` (5),
  `NEXT_PUBLIC_MAX_CATEGORIES_PER_MENU` (10), `NEXT_PUBLIC_MAX_MENU_ITEMS_PER_CATEGORY` (20) and
  `NEXT_PUBLIC_MAX_BANNERS_PER_RESTAURANT` (5) keep upstream's defaults.

## Who can sign in

A copy has one account, its owner's. They save a password of at least 12 characters as the hidden value
`MENUFIC_ADMIN_PASSWORD` (on Tofu: the app's Keys & settings, with Hide this value after saving on), deploy the app
again so it reads the value, and sign in at `/auth/signin` with it. Until then the sign-in page says plainly that nobody
can sign in yet and names the setting, and every sign-in is refused; with a shorter password it says that instead.
There is no sign-up, so no setting closes one, and no first account a stranger could take: a new copy at its public
address lets nobody in until its owner saves the password. Anyone the owner wants to edit the menu signs in with the
same password. A wrong password is answered after a second, which slows guessing; a long random password is the real
protection. Saving a new password signs out every browser that was signed in (the session secret is derived from it,
below).

Guests need no account: a published menu at `/restaurant/<id>/menu` is open to anyone, which is the product. Everything
else (the restaurants, the menu editor, banners, the preview page and the list of published menus) needs the owner.

## What Tofu changes

Each commit on `tofu` says why in its message; in short:

- **Sentry and Vercel Analytics are removed** (`sentry.*.config.js`, `next.config.mjs`, `src/pages/_error.tsx`,
  `src/pages/_app.tsx`, `package.json`): upstream reported errors to its own Sentry project and page views to Vercel
  Analytics. The pages' link previews name the copy's address (`NEXT_PUBLIC_PROD_URL`), not menufic.com, and a
  published menu's description is the restaurant's alone, its name, location and phone number
  (`src/pages/restaurant/[restaurantId]/menu.tsx`, `src/lang/en.json`): upstream ended it with "This menu was generated
  using Menufic.com", upstream's own hosted service, in every link preview and search snippet of the menu's address.
- **The owner's password replaces Google, GitHub and the test login key**
  (`src/server/tofu-owner.ts`, new; `src/pages/api/auth/[...nextauth].ts`, `src/components/LoginOptions/LoginOptions.tsx`,
  `src/pages/auth/signin.tsx`, `src/lang/en.json`; `src/pages/auth/signin-test-user.tsx` removed). Upstream let anyone
  with a Google or GitHub account sign in and make restaurants, which on a copy at a public address would let strangers
  in, and it needed the owner's own OAuth apps. Every record a copy makes belongs to the user id `owner`.
- **The session secret** is `NEXTAUTH_SECRET` when it is set, otherwise derived at start from `DATABASE_URL` and the
  owner's password (`sessionSecret` in `src/server/tofu-owner.ts`). Changing either signs everyone out.
- **The preview page reads the session from the request** (`getServerAuthSession`) instead of asking its own address
  over HTTP (`src/pages/restaurant/[restaurantId]/preview.tsx`), which a private copy's sign-in gate or a missing
  `NEXTAUTH_URL` would stop.
- **Photos are kept in the database instead of ImageKit** (`src/server/imageUtil.ts`; `src/pages/api/image/[id].ts`,
  new; `prisma/schema.prisma` and `prisma/migrations/20261028104323_tofu_image_files/`, new; the four routers in
  `src/server/api/routers/`; `src/components/ImageKitImage/ImageKitImage.tsx`). Upstream uploaded every restaurant,
  banner and dish photo to ImageKit, which needs the owner's own keys, and a copy has no disk that outlives a restart.
  An upload is decoded and stored again as WebP of at most 1600 pixels in the `ImageFile` table (a table of its own, so
  reading a menu never loads the bytes), and `/api/image/<id>` serves it with a year-long cache: an id is random and
  never reused. Deleting a dish, category, menu, banner or restaurant deletes its photos' rows where ImageKit's files
  were deleted before. `/api/health` checks the database alone and says whether the owner's password is saved.
- **The database connection** (`src/server/tofu-database.ts`, new; `src/server/db.ts`): the Prisma client connects
  with `pgbouncer=true`, since the transaction pooler keeps no prepared statement from one transaction to the next, and,
  when `SUPABASE_CA_CERT` is set, with that certificate written to a file in the temporary folder (`sslcert`) and
  `sslaccept=strict`, which checks the server's certificate and host name. With `sslmode=require` alone, Prisma
  encrypts but checks no certificate. Nothing depends on the database host's name.
- **Migrations Tofu applies** (`supabase/migrations/`, new): `20240308151629_initial_migration.sql` and
  `20261028104323_tofu_image_files.sql` are each the Prisma migration of the same name, unchanged, followed by Tofu's
  lines that turn on row-level security, with no policy, for every table that file makes. On a Tofu database the Data
  API's roles (`anon`, `authenticated`, `service_role`) are given the tables these files make, so without those lines
  anyone holding the project's public key could read and change the restaurants, menus and photos through the Data API.
  The app's own connection owns the tables, so it is not limited. `prisma/migrations/` stays for Prisma's own tools: a
  new Prisma migration has to be copied to `supabase/migrations/` too, with the same lines for any table it makes.
  Never edit an applied file: Tofu does not run a file twice.
- **Who reads a restaurant**: `restaurant.getDetails` answers a published restaurant to anyone and an unpublished one
  only to its owner; an unknown or unpublished one answers 404 instead of a server error
  (`src/server/api/routers/restaurant.router.ts`). Upstream answered any restaurant to anyone who had its id.
- **A published menu refreshes within about a minute**: the menu page is drawn again at most 60 seconds after the last
  time (upstream: 30 minutes), so the owner's changes reach guests quickly, and the publish dialog says so
  (`src/pages/restaurant/[restaurantId]/menu.tsx`, `src/lang/en.json`). Publishing or unpublishing refreshes it at once,
  as upstream did. If the hosting refuses that refresh (on Vercel it is a request the app sends to its own address),
  the change is still saved and the owner is told it worked: the error is logged as `[menufic] /restaurant/<id>/menu
  was not refreshed at once`, and the page changes within the minute (`src/server/api/routers/restaurant.router.ts`;
  upstream answered the owner with a server error, though the change was saved).
- **The home page is the copy's, not menufic.com's** (`src/pages/index.tsx`, `src/components/Footer/Footer.tsx`;
  `src/pages/privacy-policy.tsx` and `src/pages/terms-and-conditions.tsx` removed): menufic.com's pricing, its contact
  form (which posted to menufic.com's form service, and claimed success without sending anything when its key was
  unset) and its privacy policy and terms, which describe menufic.com's own service, are gone. The home page's button
  reads "Owner sign-in" (`src/lang/en.json`; upstream: "Get started for free", menufic.com's invitation to sign up),
  since it opens the owner's password page and a guest who lands there has nothing to start. The sample menu shows
  only when `NEXT_PUBLIC_SAMPLE_MENU_ID` names one of the copy's own restaurants. The "About" section still credits
  and links upstream.
- **The owner's pages fit a phone whatever the restaurant's name** (`src/styles/theme.ts`): Mantine keeps breadcrumbs
  on one line, so on a phone a restaurant name longer than about 21 characters (up to 40 are allowed) made the
  restaurant, menu editor and banners pages wider than the screen, and cut off their last crumb, as upstream does. The
  breadcrumbs wrap now, and a long name wraps inside its own crumb. Guests' pages have no breadcrumbs.
- `.env.example` lists the settings above instead of upstream's.

Every code file Tofu changed carries a comment starting with `Tofu:`; `package.json`, `package-lock.json` and the JSON
messages cannot hold comments, so this file lists them.

## What works differently on Tofu

- No error reports or analytics leave a copy.
- Photos live in the copy's database: each is typically tens to a few hundred kilobytes, and the database's size limit
  counts them.
- The published menu page can show a change up to about a minute late; the owner's own pages show it at once. A guest
  who already has the page open sees a change after a reload.
- There is no email of any kind, no reminder and no background job; none are needed.
- The playwright tests in `tests/` use upstream's test login key, which this copy removed, so they no longer run as they
  are; they are not part of the build.

## Licence

MIT, `LICENSE` (Copyright (c) 2023 Kajendran Alagaratnam), kept as it is. Bundled with the app: the Expletus Sans font
(`public/ExpletusSans-VariableFont_wght.ttf`, "Copyright 2019 The Expletus Sans Project Authors", SIL Open Font License
1.1, as the font file itself says), and upstream's own logo, landing artwork and the sample photos in
`tests/sample-images/`, which upstream ships without saying where they come from. "Menufic" and its logo are upstream's
name and mark; the copy keeps them because it is that app.

## Verification (2026-10-28)

On macOS arm64 against 127.0.0.1 only, nothing deployed, with Node 22.22.3 and npm 10.9.8, and a scratch PostgreSQL 14
database owned by a role that is not a superuser (`menufic_app`), as the app's own connection on Tofu owns its tables.

- `npm install` (and `npm uninstall @sentry/nextjs @vercel/analytics imagekit` to update the lock file), then
  `npm run build`: compiled, linted and type-checked, 15 routes. The two files in `supabase/migrations/` were applied
  with `psql -1 -v ON_ERROR_STOP=1 -f` as `menufic_app`, one transaction per file as Tofu applies them: six tables, all
  owned by `menufic_app`, each with row-level security on and not forced.
- `next start` with no `MENUFIC_ADMIN_PASSWORD`: `/` answered 200, `/api/health` `{"ownerPassword":"missing"}`, the
  sign-in page said "Nobody can sign in yet" and named `MENUFIC_ADMIN_PASSWORD`, a sign-in was refused
  (`CredentialsSignin`) and the owner's API answered 401.
- With a random 24-character password: a wrong password was refused, the right one signed in as `owner`, and through the
  app's own tRPC API a restaurant with a photo, a menu, a category and a dish with a photo were made and read back; the
  photos answered as `image/webp` with no cookie; before publishing a guest's read of the restaurant answered 404;
  after publishing, a guest with no cookie saw the dish and its photo on `/restaurant/<id>/menu`; after unpublishing the
  page no longer showed it; after deleting the restaurant its photos answered 404. That is the live check, a script kept
  outside this repository, which answered `RESULT PASS`.
- Row-level security: with stand-ins for Supabase's `anon` and `authenticated` roles given every table, `anon` and
  `authenticated` read no restaurant, dish, menu or photo row and could not add a restaurant ("new row violates
  row-level security policy"), while the app's role read its own.
- Database TLS: a scratch TLS-only PostgreSQL cluster with a certificate signed by a scratch root (host name
  `localhost`). With that root as `SUPABASE_CA_CERT`, `/api/health` answered 200; with another root, or with the right
  root but the address `127.0.0.1` (not in the certificate), it answered 500 ("The certificate was not trusted"); with
  no `SUPABASE_CA_CERT` it connected encrypted without checking, as upstream did. `HOME` was a folder nobody could read
  throughout: the app does not use libpq, and nothing looks for a client certificate there.
- Five `next start` processes started at the same moment against a new database the two files had just made all
  answered 200 on `/` and `/api/health`; nothing at start touches the schema.
- In headless Chromium at 390x844 (a phone, with touch) and 1200x750: the guest menu, a dish opened, the sign-in page,
  the owner's restaurants, the menu editor and the publish dialog with its QR code had nothing wider than the screen and
  no page or console errors, with the 13-character restaurant name "Corner bistro" (a longer name made the owner's pages
  wider than a phone until the breadcrumb fix checked below).
- The tree of the pin was exported with `git archive`, every file's executable bit removed, and installed, built and
  started from there as above: it passed the same way, since nothing runs a repository file directly.
- Tofu's own check (its GitHub import, the static lane's predicates and the safety check): 0 safety findings; 137 of
  the 500 files the Free static lane publishes; not on the static lane, as a Next.js server app.

Again on 2026-10-28, after a review's three fixes (the menu's link preview, the home page's button, a refused refresh
of the menu page), on the same machine, Node and PostgreSQL:

- The tree of `d0efa3e` (the same code as the commit that adds this paragraph) was exported with `git archive` and every
  executable bit removed; `npm install` left `package-lock.json` as it was, and `npm run build` compiled, linted with
  no warning, type-checked and listed 15 routes. Both files in `supabase/migrations/` were applied with
  `psql -1 -v ON_ERROR_STOP=1 -f` as a role that is not a superuser: six tables, owned by it, row-level security on.
- `next start` with a random 24-character password, `HOME` a folder nobody can read: the live check answered
  `RESULT PASS`. The home page's button reads "Owner sign-in", and "Get started for free" is nowhere on the page. The
  published menu page's `description` and `og:description` read "Menu of restaurant ... Corner bakery. Location: 12
  Market Street.", and the page names no menufic.com. Unpublishing took the dish off the guest page at once. With no
  password the live check also answered `RESULT PASS`: nobody got in.
- A refused refresh, the way Vercel refreshes a page: the exported tree's `next.config.mjs` was given Next.js's
  `experimental.trustHostHeader` for this run only, so the refresh became a request to `https://<host>`, which fails
  against the local server's plain HTTP. Publish and Unpublish answered 200, the log said
  `[menufic] /restaurant/<id>/menu was not refreshed at once, it will be within 60 s: Failed to revalidate ...: fetch
  failed` each time, and the guest page dropped the dish 65 seconds after unpublishing; the live check, which waits up
  to 80 seconds for that, answered `RESULT PASS`. The previous pin's code under the same run answered both with a server
  error (500) while saving the change, and logged nothing.
- Headless Chromium at 390x844 (a phone, with touch) and 1200x750: the home page's "Owner sign-in" button is on the
  screen, nothing is wider than the screen, there are no page or console errors, and the button opens `/auth/signin`.
- Tofu's own check on `d0efa3e`: 0 safety findings; 137 of the 500 files the Free static lane publishes.

Again on 2026-10-28, after a second review's fix (the breadcrumbs on a phone), on the same machine, Node and PostgreSQL:

- The tree of `4ef7944` (the same code as the commit that adds this paragraph) was exported with `git archive` and every
  executable bit removed; `npm install` left `package-lock.json` as it was, and `npm run build` compiled, linted with
  no warning, type-checked and listed 15 routes. Both files in `supabase/migrations/` were applied with
  `psql -1 -v ON_ERROR_STOP=1 -f` as a role that is not a superuser: six tables, owned by it, row-level security on.
- `next start` with a random 24-character password, `HOME` a folder nobody can read, and five published restaurants
  named "Corner bistro" (13 characters), "Golden Dragon Noodle House" (26), "Corner bistro by the old harbour" (32),
  "Corner bistro and noodle bar by the pier" (40, the longest the app allows; its menu, category, dish and price names
  at their longest too) and one 40-letter word with no space. In headless Chromium at 390x844 (a phone, with touch),
  the restaurant, menu editor and banners pages were 390 pixels wide for every name (the review had measured the menu
  editor and banners pages before this fix at 421 and 437 for the 26-character name, 442 and 458 for the 32-character
  one): the breadcrumbs take one line for "Corner bistro" and up to three for the 40-character name, which wraps inside
  its crumb, and nothing is cut off. At 1200x750 they stay on one line as before. The restaurant list, Explore, the
  preview page, the publish dialog with its QR code and the guest menu were 390 pixels wide too for every name with
  spaces, with no page or console errors. Only the 40-letter word with no space is still wider than a phone in the
  guest menu's and the preview page's title (663 pixels), as upstream.
- The live check answered `RESULT PASS` with the password, and `RESULT PASS` without one: nobody got in.
- Tofu's own check on `4ef7944`: 0 safety findings; 137 of the 500 files the Free static lane publishes.

## Needs a real deploy to verify

- The first deploy applies both files in `supabase/migrations/` before the build (the deploy's database note says what
  Tofu applied), the six tables show Protected on the app's Database page, and the deploy's answer carries no
  row-level security warning.
- The build on Tofu's server hosting: `npm install` runs `patch-package` and `prisma generate` (the Prisma CLI 5.1.1
  fetches its Linux engine), and `next build` passes its type check, which needs the `@mantine/styles` patch.
- The app reaches its database through the pooler with `SUPABASE_CA_CERT`: Prisma's `sslaccept=strict` on Linux
  (OpenSSL) accepts the pooler's certificate and host name, and no prepared-statement error appears with
  `pgbouncer=true`. Locally this ran on macOS's TLS stack against a scratch certificate, not against Tofu's pooler.
- `/api/health` answers `{"ownerPassword":"missing","status":"success"}` on a new copy; after the owner saves
  `MENUFIC_ADMIN_PASSWORD` and deploys again, it says `set`, and the owner signs in at `/auth/signin`.
- Photo uploads through the editor's crop dialog stay under the API's 1 MB request limit (the browser compresses them
  first, as upstream relied on), the photos are served from `/api/image/<id>`, and the hosting's cache keeps them.
- Publishing refreshes `/restaurant/<id>/menu` at once on Tofu's hosting (Next.js on-demand revalidation), and an edit
  to a published menu reaches the page within about a minute. If the runtime log shows `[menufic] ... was not
  refreshed at once`, the hosting refused the refresh: publishing still works, and the page changes within the minute.
- The link previews name the copy's address (`NEXT_PUBLIC_PROD_URL`).
