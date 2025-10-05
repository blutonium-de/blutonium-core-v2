// app/api/admin/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";

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
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!okKey(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const item = await prisma.product.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        slug: true,
        productName: true,
        subtitle: true,
        artist: true,
        trackTitle: true,
        priceEUR: true,
        currency: true,
        categoryCode: true,
        format: true,
        year: true,
        upcEan: true,
        catalogNumber: true,
        condition: true,
        weightGrams: true,
        isDigital: true,
        sku: true,
        stock: true,
        active: true,
        image: true,
        images: true,
        genre: true,
        fsk: true,
      },
    });

    if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (e) {
    console.error("[admin product GET]", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

// -------- PUT/PATCH --------
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!okKey(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const fskNum = parseFskToNumber(body.fsk);

    const updated = await prisma.product.update({
      where: { id: params.id },
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
        stock: Number.isFinite(body.stock) ? Number(body.stock) : 0,
        genre: body.genre ?? null,
        fsk: fskNum ?? null,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: updated.id });
  } catch (e) {
    console.error("[admin product PUT]", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export const PATCH = PUT;

// -------- DELETE --------
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!okKey(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    await prisma.product.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin product DELETE]", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}