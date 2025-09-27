-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT,
    "year" INTEGER,
    "artists" TEXT,
    "label" TEXT,
    "catalog" TEXT,
    "cover" TEXT,
    "spotifyUrl" TEXT,
    "appleUrl" TEXT,
    "beatportUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "photo" TEXT,
    "spotifyUrl" TEXT,
    "instagram" TEXT,
    "website" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
