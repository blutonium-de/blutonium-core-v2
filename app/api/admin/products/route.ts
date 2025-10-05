// app/api/admin/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function okKey(req: NextRequest) {
  const headerKey = req.headers.get("x-admin-key") || "";
  const queryKey  = req.nextUrl.searchParams.get("key") || "";
  const given     = headerKey || queryKey;
  const a = process.env.ADMIN_TOKEN || "";
  const b = process.env.NEXT_PUBLIC_ADMIN_TOKEN || "";
  if (!a && !b) return true;
  return given === a || given === b;
}

function parseFskToNumber(v: unknown): number | undefined {
  if (v == null) return undefined;
  const s = String(v).toUpperCase().replace(/\s+/g, "");
  const m = s.match(/(?:FSK)?(\d{1,2})\+?/);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  return [0, 6, 12, 16, 18].includes(n) ? n : undefined;
}

// -------- GET --------
export async function GET(req: NextRequest) {
  try {
    if (!okKey(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const q        = (sp.get("q") || "").trim();
    const catParam = (sp.get("cat") || "").trim();
    const soldOut  = sp.get("soldOut") === "1";
    const limit    = Math.min(200, Math.max(1, parseInt(sp.get("limit") || "50", 10) || 50));
    const page     = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
    const skip     = (page - 1) * limit;

    const cats = (catParam || "")
      .split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
      .map(c => (["bd","blu-ray","bluray","blu","blue"].includes(c) ? "bray" : c));

    const where: any = {};
    if (cats.length === 1) where.categoryCode = cats[0];
    if (cats.length > 1) where.categoryCode = { in: cats };

    if (q) {
      where.OR = [
        { slug:          { contains: q, mode: "insensitive" } },
        { productName:   { contains: q, mode: "insensitive" } },
        { artist:        { contains: q, mode: "insensitive" } },
        { trackTitle:    { contains: q, mode: "insensitive" } },
        { upcEan:        { contains: q, mode: "insensitive" } },
        { sku:           { contains: q, mode: "insensitive" } },
        { catalogNumber: { contains: q, mode: "insensitive" } },
        { subtitle:      { contains: q, mode: "insensitive" } },
      ];
    }
    if (soldOut) where.stock = { lte: 0 };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        select: {
          id: true,
          slug: true,
          productName: true,
          artist: true,
          trackTitle: true,
          categoryCode: true,
          priceEUR: true,
          currency: true,
          active: true,
          stock: true,
          createdAt: true,
          image: true,
          genre: true,
          format: true,
          fsk: true, // ⬅️ jetzt integer
        },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (e) {
    console.error("[admin products GET]", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

// -------- POST --------
export async function POST(req: NextRequest) {
  try {
    if (!okKey(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const fskNum = parseFskToNumber(body.fsk);

    const created = await prisma.product.create({
      data: {
        slug: body.slug,
        productName: body.productName ?? null,
        subtitle: body.subtitle ?? null,
        artist: body.artist ?? null,
        trackTitle: body.trackTitle ?? null,
        priceEUR: Number(body.priceEUR || 0),
        currency: body.currency || "EUR",
        categoryCode: body.categoryCode,
        format: body.format ?? null,
        year: body.year ?? null,
        upcEan: body.upcEan ?? null,
        catalogNumber: body.catalogNumber ?? null,
        condition: body.condition ?? null,
        weightGrams: body.weightGrams ?? null,
        isDigital: !!body.isDigital,
        sku: body.sku ?? null,
        active: body.active ?? true,
        image: body.image,
        images: Array.isArray(body.images) ? body.images : [],
        stock: Number.isFinite(body.stock) ? Number(body.stock) : 1,
        genre: body.genre ?? null,
        fsk: fskNum ?? null, // ⬅️ numerisch speichern
      },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e) {
    console.error("[admin products POST]", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}