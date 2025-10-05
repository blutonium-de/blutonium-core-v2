// app/api/products/route.ts
import { NextResponse } from "next/server";
// ⬇️ Pfad korrigiert (3x .. statt 4x)
import { prisma } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kategorien normalisieren … (Rest unverändert) */
function normalizeCats(input: string | undefined) {
  if (!input) return undefined;
  const raw = input.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const mapped = raw.map((c) =>
    c === "bd" || c === "blu-ray" || c === "bluray" || c === "blue" || c === "blu"
      ? "bray"
      : c
  );
  const allowed = new Set(["bv", "sv", "bcd", "scd", "bhs", "ss", "dvd", "bray"]);
  const cats = mapped.filter((c) => allowed.has(c));
  return cats.length ? cats : undefined;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const catParam = searchParams.get("cat") || undefined;
    const q        = (searchParams.get("q") || "").trim();
    const genre    = (searchParams.get("genre") || "").trim();

    const limit  = Math.min(100, Math.max(1, Number(searchParams.get("limit")  || "50")));
    const offset = Math.max(0, Number(searchParams.get("offset") || "0"));

    const where: any = { active: true };
    const cats = normalizeCats(catParam);
    if (cats?.length === 1) where.categoryCode = cats[0];
    else if (cats && cats.length > 1) where.categoryCode = { in: cats };

    if (q) {
      where.OR = [
        { productName:   { contains: q, mode: "insensitive" } },
        { subtitle:      { contains: q, mode: "insensitive" } },
        { artist:        { contains: q, mode: "insensitive" } },
        { trackTitle:    { contains: q, mode: "insensitive" } },
        { slug:          { contains: q, mode: "insensitive" } },
        { upcEan:        { contains: q, mode: "insensitive" } },
        { sku:           { contains: q, mode: "insensitive" } },
        { catalogNumber: { contains: q, mode: "insensitive" } },
      ];
    }
    if (genre) where.genre = { equals: genre, mode: "insensitive" };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        select: {
          id: true,
          slug: true,
          artist: true,
          trackTitle: true,
          productName: true,
          subtitle: true,
          categoryCode: true,
          condition: true,
          year: true,
          priceEUR: true,
          image: true,
          images: true,
          stock: true,
          genre: true,
          format: true,
          fsk: true, // wichtig: numerisch in DB
        },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({ items, total, limit, offset });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}