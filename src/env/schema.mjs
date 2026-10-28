// @ts-check
// Tofu: Google, GitHub, the test login key, ImageKit and Sentry are gone from these settings, and the owner's
// password (MENUFIC_ADMIN_PASSWORD), the session secret's fallback and the database's certificate are read instead
// (see TOFU.md).
import { z } from "zod";

/**
 * Specify your server-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 */
export const serverSchema = z.object({
    DATABASE_URL: z.string().url(),
    /** The owner's password, saved as a hidden value. Unset, nobody can sign in (src/server/tofu-owner.ts). */
    MENUFIC_ADMIN_PASSWORD: z.string().optional(),
    /** Optional: unset, the session secret is derived from DATABASE_URL and the owner's password. */
    NEXTAUTH_SECRET: z.string().optional(),
    /** Optional: NextAuth takes the address from the request on Vercel, as Tofu runs it. */
    NEXTAUTH_URL: z.string().optional(),
    NODE_ENV: z.enum(["development", "test", "production"]),
    /** The database server's root certificate, which Tofu saves beside DATABASE_URL (src/server/tofu-database.ts). */
    SUPABASE_CA_CERT: z.string().optional(),
});

/**
 * Specify your client-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 * To expose them to the client, prefix them with `NEXT_PUBLIC_`.
 */
export const clientSchema = z.object({
    NEXT_PUBLIC_CONTACT_EMAIL: z.string().optional().default(""),
    NEXT_PUBLIC_FORM_API_KEY: z.string().optional(),
    NEXT_PUBLIC_MAX_BANNERS_PER_RESTAURANT: z.string().regex(/^\d+$/).default("5"),
    NEXT_PUBLIC_MAX_CATEGORIES_PER_MENU: z.string().regex(/^\d+$/).default("10"),
    NEXT_PUBLIC_MAX_MENUS_PER_RESTAURANT: z.string().regex(/^\d+$/).default("5"),
    NEXT_PUBLIC_MAX_MENU_ITEMS_PER_CATEGORY: z.string().regex(/^\d+$/).default("20"),
    NEXT_PUBLIC_MAX_RESTAURANTS_PER_USER: z.string().regex(/^\d+$/).default("5"),
    /** This copy's own address, which Tofu saves before the first deploy. */
    NEXT_PUBLIC_PROD_URL: z.string().optional().default(""),
    NEXT_PUBLIC_SAMPLE_MENU_ID: z.string().optional(),
});

/**
 * You can't destruct `process.env` as a regular object, so you have to do
 * it manually here. This is because Next.js evaluates this at build time,
 * and only used environment variables are included in the build.
 * @type {{ [k in keyof z.infer<typeof clientSchema>]: z.infer<typeof clientSchema>[k] | undefined }}
 */
export const clientEnv = {
    NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
    NEXT_PUBLIC_FORM_API_KEY: process.env.NEXT_PUBLIC_FORM_API_KEY,
    NEXT_PUBLIC_MAX_BANNERS_PER_RESTAURANT: process.env.NEXT_PUBLIC_MAX_BANNERS_PER_RESTAURANT,
    NEXT_PUBLIC_MAX_CATEGORIES_PER_MENU: process.env.NEXT_PUBLIC_MAX_CATEGORIES_PER_MENU,
    NEXT_PUBLIC_MAX_MENUS_PER_RESTAURANT: process.env.NEXT_PUBLIC_MAX_MENUS_PER_RESTAURANT,
    NEXT_PUBLIC_MAX_MENU_ITEMS_PER_CATEGORY: process.env.NEXT_PUBLIC_MAX_MENU_ITEMS_PER_CATEGORY,
    NEXT_PUBLIC_MAX_RESTAURANTS_PER_USER: process.env.NEXT_PUBLIC_MAX_RESTAURANTS_PER_USER,
    NEXT_PUBLIC_PROD_URL: process.env.NEXT_PUBLIC_PROD_URL,
    NEXT_PUBLIC_SAMPLE_MENU_ID: process.env.NEXT_PUBLIC_SAMPLE_MENU_ID,
};
