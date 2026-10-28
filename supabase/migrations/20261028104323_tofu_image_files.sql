-- CreateTable
CREATE TABLE "ImageFile" (
    "id" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageFile_pkey" PRIMARY KEY ("id")
);

-- Tofu (2026-10-28): the lines above are prisma/migrations/20261028104323_tofu_image_files/migration.sql unchanged. Row-level
-- security on, with no policy, for the table this file makes, for the reason the first file gives. Never remove or
-- edit this line. A later migration that adds a table needs the same line for that table, in the same file.
ALTER TABLE "ImageFile" ENABLE ROW LEVEL SECURITY;
