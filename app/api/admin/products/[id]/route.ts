// app/api/admin/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { ensureAdmin } from "../../../../../lib/adminAuth";

// GET /api/admin/products/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const prod = await prisma.product.findUnique({
      where: { id: params.id },
    });
    if (!prod) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // images ist Json in deinem Schema → immer als Array zurückgeben
    const images = Array.isArray((prod as any).images)
      ? (prod as any).images
      : [];

    return NextResponse.json({ ...prod, images });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/products/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Admin prüfen
  const denied = ensureAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: {
        slug: body.slug,
        productName: body.productName ?? null,
        subtitle: body.subtitle ?? null,
        artist: body.artist ?? null,
        trackTitle: body.trackTitle ?? null,
        priceEUR: Number(body.priceEUR ?? 0),
        currency: body.currency ?? "EUR",
        categoryCode: body.categoryCode ?? "ss",
        format: body.format ?? null,
        year: body.year ?? null,
        upcEan: body.upcEan ?? null,
        catalogNumber: body.catalogNumber ?? null,
        condition: body.condition ?? null,
        weightGrams: body.weightGrams ?? null,
        isDigital: !!body.isDigital,
        sku: body.sku ?? null,
        // nur setzen, wenn übergeben (sonst unverändert lassen)
        active: typeof body.active === "boolean" ? body.active : undefined,
        image: body.image || "",
        images: Array.isArray(body.images) ? body.images : [],
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/products/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Admin prüfen
  const denied = ensureAdmin(req);
  if (denied) return denied;

  try {
    // optionale Aufräumarbeiten (Bestell-Relationen)
    await prisma.orderItem.deleteMany({
      where: { productId: params.id },
    });

    await prisma.product.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}