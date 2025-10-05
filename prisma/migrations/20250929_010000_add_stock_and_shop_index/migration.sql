-- 1) Spalte "stock" nachrüsten (Default 1)
ALTER TABLE "public"."Product"
ADD COLUMN IF NOT EXISTS "stock" INTEGER NOT NULL DEFAULT 1;
-- 2) Performance-Index (nur aktive + auf Lager)
CREATE INDEX IF NOT EXISTS "Product_active_instock_cat_date_idx"
ON "public"."Product" ("categoryCode", "createdAt" DESC)
WHERE "active" = true AND "stock" > 0;
