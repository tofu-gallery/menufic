// @ts-check
// Tofu: Sentry's wrapper and the ImageKit image host are removed (see TOFU.md): a copy reports to no one, and its
// photos are served by the app itself from its own database.
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */
if (!process.env.SKIP_ENV_VALIDATION) {
    await import("./src/env/server.mjs");
}

/** @type {import("next").NextConfig} */
const config = {
    i18n: { defaultLocale: "en", locales: ["en"] },
    images: {
        formats: ["image/avif", "image/webp"],
        unoptimized: true,
    },
    reactStrictMode: false,
    swcMinify: true,
};

export default config;
