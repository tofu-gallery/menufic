import { PrismaClient } from "@prisma/client";

import { env } from "src/env/server.mjs";
import { databaseUrl } from "src/server/tofu-database";

declare global {
    // eslint-disable-next-line no-var, vars-on-top
    var prisma: PrismaClient | undefined;
}

// Tofu: the client connects with DATABASE_URL as src/server/tofu-database.ts prepares it for Tofu's pooler and its
// certificate (see TOFU.md).
export const prisma =
    global.prisma ||
    new PrismaClient({
        datasources: { db: { url: databaseUrl(env.DATABASE_URL) } },
        log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });

if (env.NODE_ENV !== "production") {
    global.prisma = prisma;
}
