// app/api/checkout/confirm/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/checkout/confirm?session_id=cs_test_...
 *
 * Erwartet:
 *   - session_id: Stripe-Session-ID (wir nutzen sie als prisma.Order.stripeId)
 *
 * Wirkung:
 *   - Sucht Order per stripeId
 *   - Wenn bereits angewendet (status = 'stock_applied'), antwortet ok:true (idempotent)
 *   - Sonst: reduziert für jedes OrderItem den Product.stock um qty (nicht < 0),
 *            setzt Product.active=false wenn stock danach 0 ist,
 *            und markiert die Order mit status='stock_applied'
 */
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = (url.searchParams.get("session_id") || "").trim();
    if (!sessionId) {
      return NextResponse.json(
        { error: "session_id fehlt" },
        { status: 400 }
      );
    }

    // Bestellung holen
    const order = await prisma.order.findUnique({
      where: { stripeId: sessionId },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Bestellung nicht gefunden" },
        { status: 404 }
      );
    }

    // Idempotenz: wenn bereits angewendet, nichts mehr tun
    if (order.status === "stock_applied") {
      return NextResponse.json({ ok: true, alreadyApplied: true });
    }

    // Option: Nur bei "paid"/"succeeded" anwenden (falls du Stripe-Status setzt)
    // Wenn du das erzwingen willst, entkommentieren:
    // if (order.status !== "paid" && order.status !== "succeeded") {
    //   return NextResponse.json(
    //     { error: "Order noch nicht bezahlt/bestätigt." },
    //     { status: 400 }
    //   );
    // }

    // Reduktion in einer Transaktion durchführen
    const updates = await prisma.$transaction(async (tx) => {
      const results: Array<{ productId: string; from: number; to: number }> = [];

      for (const it of order.items) {
        if (!it.productId || it.qty <= 0) continue;

        // aktuellen Bestand holen
        const prod = await tx.product.findUnique({
          where: { id: it.productId },
          select: { id: true, stock: true, active: true },
        });
        if (!prod) continue;

        const current = Math.max(0, prod.stock ?? 0);
        const next = Math.max(0, current - it.qty);

        if (next === current) {
          // nichts zu tun (z. B. schon 0)
          continue;
        }

        // Update: stock setzen, active bei 0 deaktivieren
        await tx.product.update({
          where: { id: prod.id },
          data: {
            stock: next,
            active: next > 0 ? prod.active : false,
          },
        });

        results.push({ productId: prod.id, from: current, to: next });
      }

      // Bestellung als angewendet markieren (idempotenz)
      await tx.order.update({
        where: { id: order.id },
        data: { status: "stock_applied" },
      });

      return results;
    });

    return NextResponse.json({
      ok: true,
      updated: updates.length,
      items: updates,
    });
  } catch (e: any) {
    console.error("[/api/checkout/confirm] error:", e);
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 }
    );
  }
}