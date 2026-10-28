// Tofu: this route is Tofu's addition (see TOFU.md). It serves a photo the app stored in its own database
// (src/server/imageUtil.ts). A photo's id is random and never reused, so its bytes never change and browsers and the
// hosting's cache may keep them for a year.
import type { NextApiRequest, NextApiResponse } from "next";

import { prisma } from "src/server/db";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
        res.setHeader("Allow", "GET, HEAD");
        res.status(405).end();
        return;
    }
    const id = typeof req.query.id === "string" ? req.query.id : "";
    const image = /^[A-Za-z0-9_-]{1,64}$/.test(id)
        ? await prisma.imageFile.findUnique({ select: { data: true, mimeType: true }, where: { id } })
        : null;
    if (!image) {
        res.setHeader("Cache-Control", "no-store");
        res.status(404).json({ error: "No such image" });
        return;
    }
    res.setHeader("Content-Type", image.mimeType);
    res.setHeader("Content-Length", image.data.length);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
    res.status(200).end(req.method === "HEAD" ? undefined : image.data);
};

export default handler;
