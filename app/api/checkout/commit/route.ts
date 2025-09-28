// app/api/checkout/commit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Body: { items: Array<{ productId: string; qty: number }> }
 * Wirkung:
 *  - zieht pro Produkt qty vom stock ab (nicht unter 0)
 *  - wenn stock dadurch 0 → active = false
 *  - idempotent genug für einfachen Bedarf (keine negative Bestandsbuchung)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: Array<{ productId: string; qty: number }> = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ ok: true, changed: 0 });
    }

    let changed = 0;

    await prisma.$transaction(async (tx) => {
      for (const it of items) {
        const qty = Math.max(0, Number(it.qty || 0));
        if (!it.productId || qty <= 0) continue;

        // aktuellen Stock holen
        const prod = await tx.product.findUnique({ where: { id: it.productId }, select: { stock: true } });
        if (!prod) continue;

        const nextStock = Math.max(0, (prod.stock ?? 0) - qty);

        await tx.product.update({
          where: { id: it.productId },
          data: {
            stock: nextStock,
            active: nextStock > 0, // bei 0 -> deaktivieren
          },
        });
        changed++;
      }
    });

    return NextResponse.json({ ok: true, changed });
  } catch (e: any) {
    console.error("[checkout/commit] error:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}