// Tofu: the owner signs in with their password (MENUFIC_ADMIN_PASSWORD), the one way in to a copy. Google, GitHub and
// the test login key are removed: with them, anyone with a Google or GitHub account could sign in to a copy at its
// public address and make restaurants there (see TOFU.md and src/server/tofu-owner.ts).
import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { isOwnerPassword, OWNER_USER_ID, sessionSecret } from "src/server/tofu-owner";

/** How long a wrong password waits before it is answered, which slows down guessing. */
const WRONG_PASSWORD_DELAY_MS = 1000;

export const authOptions: NextAuthOptions = {
    // Include user.id on session
    callbacks: {
        session({ session, token }) {
            if (session.user && token.sub) {
                // eslint-disable-next-line no-param-reassign
                session.user.id = token.sub;
            }
            return session;
        },
    },
    pages: { signIn: "/auth/signin" },
    providers: [
        CredentialsProvider({
            async authorize(credentials) {
                if (isOwnerPassword(credentials?.password)) {
                    return { email: null, id: OWNER_USER_ID, image: null, name: "Owner" };
                }
                await new Promise((resolve) => setTimeout(resolve, WRONG_PASSWORD_DELAY_MS));
                // A null answer shows the sign-in page's error.
                return null;
            },
            credentials: { password: { label: "Password", type: "password" } },
            id: "owner-password",
            name: "Owner password",
            type: "credentials",
        }),
    ],
    secret: sessionSecret(),
    session: {
        // Seconds - How long until an idle session expires and is no longer valid.
        maxAge: 30 * 24 * 60 * 60, // 30 days
        strategy: "jwt",
        // Seconds - Throttle how frequently to write to database to extend a session.
        // Use it to limit write operations. Set to 0 to always update the database.
        // Note: This option is ignored if using JSON Web Tokens
        updateAge: 24 * 60 * 60, // 24 hours
    },
};

export default NextAuth(authOptions);
