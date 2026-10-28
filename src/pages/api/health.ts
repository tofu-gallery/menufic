import type { NextApiRequest, NextApiResponse } from "next";

import { prisma } from "src/server/db";
import { ownerPasswordState } from "src/server/tofu-owner";

/**
 * Health check endpoint to verify whether Menufic is able to communicate with the Database.
 * Tofu: ImageKit is no longer used, and the answer says whether the owner's password is saved (`missing`, `too_short`
 * or `set`), as the sign-in page does (see TOFU.md).
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    await Promise.all([prisma.restaurant.findFirst(), prisma.imageFile.findFirst({ select: { id: true } })]);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ ownerPassword: ownerPasswordState(), status: "success" });
};

export default handler;
