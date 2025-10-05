// app/api/orders/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Erwartet Body: { items: [{ id: string; qty: number }][] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const items: Array<{ id: string; qty: number }> = Array.isArray(body?.items) ? body.items : [];

    if (!items.length) {
      return NextResponse.json({ ok: false, error: "no items" }, { status: 400 });
    }

    // Transaktion: jede Position prüfen & stock reduzieren
    await prisma.$transaction(async (tx) => {
      for (const it of items) {
        const id = String(it.id || "").trim();
        const qty = Math.max(1, Number(it.qty) || 1);
        if (!id) continue;

        // aktuellen Bestand holen
        const current = await tx.product.findUnique({
          where: { id },
          select: { stock: true, active: true },
        });
        if (!current) continue;

        const newStock = Math.max(0, (current.stock ?? 0) - qty);
        const shouldDeactivate = newStock <= 0;

        await tx.product.update({
          where: { id },
          data: {
            stock: newStock,
            ...(shouldDeactivate ? { active: false } : {}),
          },
        });
      }
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("[orders/complete] error", e);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}