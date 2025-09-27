-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "productName" TEXT,
    "subtitle" TEXT,
    "artist" TEXT,
    "trackTitle" TEXT,
    "priceEUR" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "image" TEXT NOT NULL,
    "images" JSONB NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "format" TEXT,
    "year" INTEGER,
    "upcEan" TEXT,
    "catalogNumber" TEXT,
    "condition" TEXT,
    "weightGrams" INTEGER,
    "isDigital" BOOLEAN NOT NULL DEFAULT false,
    "sku" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
