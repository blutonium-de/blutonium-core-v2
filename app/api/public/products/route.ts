// app/api/public/products/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

// GET /api/public/products?ids=abc,def,ghi
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids")?.trim() || "";

  if (!idsParam) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  try {
    const items = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        slug: true,
        productName: true,
        artist: true,
        trackTitle: true,
        priceEUR: true,
        image: true,
        weightGrams: true,
        isDigital: true,
        active: true,
        stock: true,           // << NEU: Bestand mitgeben
        genre: true,           // << NEU: Genre mitgeben
      },
    });

    // In derselben Reihenfolge wie angefragt zurückgeben
    const byId = new Map(items.map((it) => [it.id, it]));
    const ordered = ids
      .map((id) => byId.get(id))
      .filter(Boolean);

    return NextResponse.json({ items: ordered }, { status: 200 });
  } catch (e: any) {
    console.error("/api/public/products error:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";