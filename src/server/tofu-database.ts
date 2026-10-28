// Tofu: this file is Tofu's addition, used by src/server/db.ts (see TOFU.md).
import { createHash } from "crypto";
import { existsSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

/** Prisma reads a root certificate from a file, so SUPABASE_CA_CERT is written to one, named after its contents. */
const certificateFile = (pem: string) => {
    const file = join(
        tmpdir(),
        `menufic-database-ca-${createHash("sha256").update(pem).digest("hex").slice(0, 16)}.pem`
    );
    if (!existsSync(file)) {
        writeFileSync(file, `${pem}\n`, { mode: 0o644 });
    }
    return file;
};

/**
 * The URL the app's Prisma client connects with: DATABASE_URL, with what a database Tofu manages needs.
 *
 * - `pgbouncer=true`: Tofu's DATABASE_URL is a transaction pooler, which keeps no prepared statement from one
 *   transaction to the next, so Prisma must not rely on them. On a direct connection it changes nothing that matters.
 * - When SUPABASE_CA_CERT (the database server's root certificate, which Tofu saves beside DATABASE_URL) is set, the
 *   server is verified against it: `sslcert` names it and `sslaccept=strict` checks the server's certificate and host
 *   name. With `sslmode=require` alone, Prisma encrypts the connection but checks no certificate. Verification is
 *   never turned off here, and nothing depends on the database's host name.
 */
export const databaseUrl = (raw = process.env.DATABASE_URL ?? "") => {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        // Not the parser's own error, which would carry the URL and its password; Prisma names the problem itself.
        return raw;
    }
    if (!url.searchParams.has("pgbouncer")) {
        url.searchParams.set("pgbouncer", "true");
    }
    const certificate = process.env.SUPABASE_CA_CERT?.trim();
    if (certificate) {
        url.searchParams.set("sslmode", "require");
        url.searchParams.set("sslcert", certificateFile(certificate));
        url.searchParams.set("sslaccept", "strict");
    }
    return url.toString();
};
