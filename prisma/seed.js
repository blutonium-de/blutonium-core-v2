// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

function inferWeightGrams(p) {
  if (typeof p.weightGrams === "number" && p.weightGrams > 0) return p.weightGrams;
  if (typeof p.weight_grams === "number" && p.weight_grams > 0) return p.weight_grams;

  const hay = `${p?.title ?? ""} ${p?.subtitle ?? ""} ${p?.type ?? ""} ${p?.slug ?? ""}`.toLowerCase();

  if (hay.includes("vinyl") || hay.includes("lp") || p?.type === "vinyl") return 350;
  if ((hay.includes("doppel") && hay.includes("cd")) || hay.includes("2cd") || hay.includes("double cd") || p?.type === "2cd") return 100;
  if (hay.includes("cd") || p?.type === "cd") return 90;
  return 200;
}

async function main() {
  const jsonPath = path.join(process.cwd(), "data", "products.json");
  const raw = fs.readFileSync(jsonPath, "utf-8");
  const list = JSON.parse(raw);

  for (const p of list) {
    const slug = p.slug || (p.productName || `${p.artist || ""}-${p.trackTitle || ""}`).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
    const weight = inferWeightGrams(p);

    const image = p.image || "/shop/placeholder-500.jpg";
    const images = Array.isArray(p.images) && p.images.length ? p.images : [image];

    await prisma.product.upsert({
      where: { slug },
      create: {
        slug,
        productName: p.productName ?? null,
        subtitle: p.subtitle ?? null,
        artist: p.artist ?? null,
        trackTitle: p.trackTitle ?? null,

        priceEUR: typeof p.priceEUR === "number" ? p.priceEUR : 0,
        currency: p.currency || "EUR",

        image,
        images,

        categoryCode: p.categoryCode || p.category || "ss",
        format: p.format ?? null,
        year: p.year ?? null,
        upcEan: p.upcEan ?? null,
        catalogNumber: p.catalogNumber ?? null,
        condition: p.condition ?? null,

        weightGrams: weight,
        isDigital: !!p.isDigital,
        sku: p.sku ?? null,

        active: p.active !== false, // default true
      },
      update: {
        productName: p.productName ?? null,
        subtitle: p.subtitle ?? null,
        artist: p.artist ?? null,
        trackTitle: p.trackTitle ?? null,
        priceEUR: typeof p.priceEUR === "number" ? p.priceEUR : 0,
        currency: p.currency || "EUR",
        image,
        images,
        categoryCode: p.categoryCode || p.category || "ss",
        format: p.format ?? null,
        year: p.year ?? null,
        upcEan: p.upcEan ?? null,
        catalogNumber: p.catalogNumber ?? null,
        condition: p.condition ?? null,
        weightGrams: weight,
        isDigital: !!p.isDigital,
        sku: p.sku ?? null,
        active: p.active !== false,
      },
    });
  }

  console.log(`Seed fertig. Produkte: ${list.length}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });