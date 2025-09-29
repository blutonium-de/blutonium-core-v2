// app/api/admin/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function okKey(req: NextRequest) {
  const headerKey = req.headers.get("x-admin-key") || "";
  const queryKey = req.nextUrl.searchParams.get("key") || "";
  const k = headerKey || queryKey;
  const a = process.env.ADMIN_TOKEN || "";
  const b = process.env.NEXT_PUBLIC_ADMIN_TOKEN || "";
  return !a && !b ? true : k === a || k === b;
}

// -------- GET: Liste --------
export async function GET(req: NextRequest) {
  try {
    if (!okKey(req)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const cat = (req.nextUrl.searchParams.get("cat") || "").trim();
    const soldOut = req.nextUrl.searchParams.get("soldOut") === "1";

    const where: any = {};
    if (q) {
      where.OR = [
        { slug: { contains: q, mode: "insensitive" } },
        { productName: { contains: q, mode: "insensitive" } },
        { artist: { contains: q, mode: "insensitive" } },
        { trackTitle: { contains: q, mode: "insensitive" } },
        { upcEan: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
      ];
    }
    if (cat) where.categoryCode = cat;
    if (soldOut) where.stock = { lte: 0 };

    const items = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
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
        image: true,   // Cover für Listenansicht
        genre: true,   // ⬅️ NEU
      },
    });

    return NextResponse.json({ items });
  } catch (e) {
    console.error("[admin products GET]", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

// -------- POST: anlegen --------
export async function POST(req: NextRequest) {
  try {
    if (!okKey(req)) {
      return NextResponse.json({ error: "Unauthorized: invalid admin token." }, { status: 401 });
    }

    const body = await req.json();

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
        images: body.images || [],
        stock: Number.isFinite(body.stock) ? Number(body.stock) : 1, // default 1
        genre: body.genre ?? null, // ⬅️ NEU
      },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e) {
    console.error("[admin products POST]", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}