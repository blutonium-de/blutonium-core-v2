// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "../../../../lib/stripe";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const sig = req.headers.get("stripe-signature");
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!sig || !secret) return NextResponse.json({ error: "missing webhook config" }, { status: 500 });

    const raw = await req.text();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(raw, sig, secret);
    } catch (err: any) {
      return NextResponse.json({ error: `invalid signature: ${err?.message || String(err)}` }, { status: 400 });
    }

    async function markPaidAndDecrement(orderId?: string | null, txnId?: string | null) {
      if (!orderId) return;
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.update({
          where: { id: orderId },
          data: {
            status: "paid",
            paidAt: new Date(),
            paymentProvider: "stripe",
            paymentMethod: "stripe",
            transactionId: txnId || undefined,
          },
          include: { items: true },
        });

        for (const it of order.items) {
          if (!it.productId || !it.qty) continue;
          const p = await tx.product.findUnique({ where: { id: it.productId }, select: { stock: true } });
          if (!p) continue;
          const newStock = Math.max(0, Number(p.stock ?? 0) - Number(it.qty));
          await tx.product.update({
            where: { id: it.productId },
            data: { stock: newStock, ...(newStock <= 0 ? { active: false } : {}) },
          });
        }
      });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const orderId = (s.metadata && (s.metadata as any).orderId) || s.client_reference_id || null;
        const txnId =
          (typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id) || s.id;
        await markPaidAndDecrement(orderId, txnId);
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = (pi.metadata && (pi.metadata as any).orderId) || null;
        await markPaidAndDecrement(orderId, pi.id);
        break;
      }
      case "charge.succeeded": {
        const ch = event.data.object as Stripe.Charge;
        const orderId = (ch.metadata && (ch.metadata as any).orderId) || null;
        await markPaidAndDecrement(orderId, ch.payment_intent?.toString() || ch.id);
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}