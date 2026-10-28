// Tofu: this file is Tofu's addition (see TOFU.md). A copy on Tofu has one account, its owner's, who signs in with the
// password they save as the hidden value MENUFIC_ADMIN_PASSWORD. Upstream signed people in with Google or GitHub, which
// would let anyone with such an account into a copy at a public address.
import { createHash, timingSafeEqual } from "crypto";

/** Every restaurant, menu and photo in a copy belongs to this one account: the owner's. */
export const OWNER_USER_ID = "owner";

/** The shortest password a copy accepts, since a copy answers at a public address that anyone can try. */
export const OWNER_PASSWORD_MIN_LENGTH = 12;

/** Whether the owner's password is saved: `missing` and `too_short` let nobody in. */
export type OwnerPasswordState = "missing" | "set" | "too_short";

const ownerPassword = () => process.env.MENUFIC_ADMIN_PASSWORD ?? "";

export const ownerPasswordState = (): OwnerPasswordState => {
    const password = ownerPassword();
    if (!password) {
        return "missing";
    }
    return password.length < OWNER_PASSWORD_MIN_LENGTH ? "too_short" : "set";
};

const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();

/** Whether `given` is the owner's password. Always false while the password is unset or too short. */
export const isOwnerPassword = (given: unknown) => {
    if (ownerPasswordState() !== "set" || typeof given !== "string") {
        return false;
    }
    return timingSafeEqual(digest(given), digest(ownerPassword()));
};

/**
 * NEXTAUTH_SECRET when it is set; otherwise a secret derived from DATABASE_URL and the owner's password, so a copy
 * needs no secret of its own, and saving a new password signs out every browser that was signed in.
 */
export const sessionSecret = () =>
    process.env.NEXTAUTH_SECRET ||
    createHash("sha256")
        .update(`menufic-session\u0000${process.env.DATABASE_URL ?? ""}\u0000${ownerPassword()}`, "utf8")
        .digest("base64");
