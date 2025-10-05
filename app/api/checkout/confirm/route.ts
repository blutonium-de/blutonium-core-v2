// app/api/checkout/confirm/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/checkout/confirm?session_id=cs_xxx
 * Erfolgreiche Stripe-Session bestätigen:
 *  - liest orderId aus session.metadata.orderId
 *  - setzt Order auf "paid"
 *  - reduziert Bestände (idempotent – nur wenn vorher nicht paid)
 *  - speichert stripeId
 *  - triggert /api/order/confirm (PDF + Mails)
 */
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = (url.searchParams.get("session_id") || "").trim();
    if (!sessionId) {
      return NextResponse.json({ error: "missing session_id" }, { status: 400 });
    }

    // Stripe-Session holen
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return NextResponse.json({ error: "session not found" }, { status: 404 });
    }

    const orderId = String(session.metadata?.orderId || "").trim();
    if (!orderId) {
      return NextResponse.json({ error: "orderId missing in session.metadata" }, { status: 400 });
    }

    // Idempotenz: wenn Order bereits mit dieser Session verknüpft → fertig
    const already = await prisma.order.findFirst({
      where: { id: orderId, stripeId: sessionId, status: "paid" },
      select: { id: true },
    });
    if (already) {
      return NextResponse.json({ ok: true, already: true, orderId }, { status: 200 });
    }

    // Atomar: Bestände reduzieren & Order aktualisieren, aber nur wenn noch nicht "paid"
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) throw new Error("order not found");

      // Wenn schon bezahlt, nur stripeId nachziehen und zurück
      if (order.status === "paid") {
        if (!order.stripeId) {
          await tx.order.update({
            where: { id: order.id },
            data: { stripeId: sessionId },
          });
        }
        return order;
      }

      // Bestände reduzieren (nur einmal, weil wir nur im 'nicht paid' Fall hier landen)
      for (const it of order.items) {
        if (!it.productId) continue; // z.B. Versandzeile
        await tx.product.update({
          where: { id: it.productId },
          data: { stock: { decrement: it.qty } },
        });
      }

      const totalFromStripe = Number(session.amount_total || 0);
      const currency = String(session.currency || order.currency || "eur").toUpperCase();
      const emailFromStripe = (session.customer_details?.email as string) || order.email || null;

      const next = await tx.order.update({
        where: { id: order.id },
        data: {
          status: "paid",
          stripeId: sessionId,
          paymentProvider: "stripe" as any,
          amountTotal: totalFromStripe > 0 ? totalFromStripe : order.amountTotal,
          currency,
          email: emailFromStripe,
        },
      });

      return next;
    });

    // PDF + Rechnungsmails triggern (non-blocking)
    try {
      const base =
        (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASEURL || "").trim();
      if (base) {
        await fetch(`${base}/api/order/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
      } else {
        // Fallback: relative URL (nur wenn Server sich selbst erreichen kann)
        await fetch(`/api/order/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        }).catch(() => {});
      }
    } catch (e) {
      console.warn("order/confirm trigger failed (non-blocking):", e);
    }

    return NextResponse.json({ ok: true, orderId: updated.id, status: updated.status }, { status: 200 });
  } catch (e: any) {
    console.error("[checkout/confirm] error:", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}