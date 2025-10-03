// app/api/public/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mappt Aliasse auf bray und validiert Kategorien
function normalizeCats(input: string | undefined) {
  if (!input) return undefined;
  const raw = input
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  const mapped = raw.map(c => {
    if (c === "bd" || c === "blu-ray" || c === "bluray" || c === "blue" || c === "blu") return "bray";
    return c;
  });

  const allowed = new Set(["bv","sv","bcd","scd","bhs","ss","dvd","bray"]);
  const cats = mapped.filter(c => allowed.has(c));
  return cats.length ? cats : undefined;
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const q      = (sp.get("q") || "").trim();
    const genre  = (sp.get("genre") || "").trim();
    const catRaw = (sp.get("cat") || "").trim();

    const limit  = Math.min(100, Math.max(1, Number(sp.get("limit")  || 60)));
    const offset = Math.max(0, Number(sp.get("offset") || 0));

    const where: any = {
      active: true,
      stock: { gt: 0 },
    };

    // Kategorien anwenden
    const cats = normalizeCats(catRaw || undefined);
    if (cats && cats.length === 1) where.categoryCode = cats[0];
    else if (cats && cats.length > 1) where.categoryCode = { in: cats };
    else {
      // Kein cat übergeben ⇒ Standard: KEINE Filme im Public-Listing
      where.categoryCode = { in: ["bv","sv","bcd","scd","bhs","ss"] };
    }

    if (q) {
      where.OR = [
        { slug:          { contains: q, mode: "insensitive" } },
        { productName:   { contains: q, mode: "insensitive" } },
        { artist:        { contains: q, mode: "insensitive" } },
        { trackTitle:    { contains: q, mode: "insensitive" } },
        { subtitle:      { contains: q, mode: "insensitive" } },
        { upcEan:        { contains: q, mode: "insensitive" } },
        { sku:           { contains: q, mode: "insensitive" } },
        { catalogNumber: { contains: q, mode: "insensitive" } },
      ];
    }

    if (genre) {
      // exakt (case-insensitive), passend zu deinen Genre-Buttons
      where.genre = { equals: genre, mode: "insensitive" };
    }

    const items = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        slug: true,
        productName: true,
        artist: true,
        trackTitle: true,
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
        // ⬇️  FSK MIT AUSLIEFERN
        fsk: true,
      },
    });

    return NextResponse.json({ items, limit, offset });
  } catch (e: any) {
    console.error("[public products GET]", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}