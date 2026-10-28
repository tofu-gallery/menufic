/* eslint-disable no-bitwise */
// Tofu: photos are kept in the app's own database (the ImageFile table) and served at /api/image/<id>, instead of
// being uploaded to ImageKit, which needed the owner's own ImageKit keys (see TOFU.md). `uploadImage` keeps the shape
// of ImageKit's answer that the routers read (`fileId`, `filePath`), and `deleteImage`/`deleteImages` take the place of
// ImageKit's `deleteFile`/`bulkDeleteFiles`.
import { encode } from "blurhash";
import { FastAverageColor } from "fast-average-color";
import { nanoid } from "nanoid";
import sharp from "sharp";

import { prisma } from "src/server/db";

const fac = new FastAverageColor();

/** The longest side a stored photo keeps; the app shows none larger. */
const MAX_IMAGE_SIDE = 1600;

/** Get the uri of a base64 image */
export const getImageUriFromBase64 = (imageBase64: string) => {
    const uri = imageBase64.split(";base64,").pop();

    if (!uri) {
        throw new Error("Failed to convert imageBase64 to uri");
    }
    return uri;
};

/** The address the app serves a stored photo at. */
export const imagePathOf = (id: string) => `/api/image/${id}`;

/**
 * Store an image in the database after converting it to a WebP file. The image is decoded and encoded again, so what
 * is stored is always a plain WebP picture whatever was sent. The folder ImageKit used is not needed any more.
 */
export const uploadImage = async (imageBase64: string, _imageFolder?: string) => {
    const uri = getImageUriFromBase64(imageBase64);

    const webpImageBuffer = await sharp(Buffer.from(uri, "base64"))
        .rotate()
        .resize({ fit: "inside", height: MAX_IMAGE_SIDE, width: MAX_IMAGE_SIDE, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();

    const fileId = nanoid(24);
    await prisma.imageFile.create({ data: { data: webpImageBuffer, id: fileId, mimeType: "image/webp" } });

    return { fileId, filePath: imagePathOf(fileId) };
};

/**
 * Delete the stored bytes of the images with these ids. It starts at once, as ImageKit's call did, even where a router
 * does not wait for it (a Prisma query on its own would only run once awaited).
 */
export const deleteImages = async (ids: string[]) => {
    if (ids.length === 0) {
        return { count: 0 };
    }
    return prisma.imageFile.deleteMany({ where: { id: { in: ids } } });
};

/** Delete the stored bytes of one image. */
export const deleteImage = (id: string) => deleteImages([id]);

/** Generate a blur hash value to the uploading image */
export const encodeImageToBlurhash = async (imageBase64: string) => {
    const uri = getImageUriFromBase64(imageBase64);

    const { data, info } = await sharp(Buffer.from(uri, "base64"))
        .raw()
        .ensureAlpha()
        .resize(32, 32, { fit: "inside" })
        .toBuffer({ resolveWithObject: true });

    return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
};

/** Extract the average color of the image */
export const getColor = async (imageBase64: string) => {
    const uri = getImageUriFromBase64(imageBase64);

    const { data } = await sharp(Buffer.from(uri, "base64"))
        .raw()
        .ensureAlpha()
        .resize(32, 32, { fit: "inside" })
        .toBuffer({ resolveWithObject: true });

    return fac.getColorFromArray4(data);
};

/** Generate hex color value from rgb values */
export const rgba2hex = (rgb1: number, rgb2: number, rgb3: number) => {
    const hex =
        (rgb1 | (1 << 8)).toString(16).slice(1) +
        (rgb2 | (1 << 8)).toString(16).slice(1) +
        (rgb3 | (1 << 8)).toString(16).slice(1);

    return `#${hex}`;
};
