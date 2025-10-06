// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { finalizeOrderAndInventory } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const sig = req.headers.get("stripe-signature");
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!sig || !secret) {
      return NextResponse.json({ error: "missing webhook config" }, { status: 500 });
    }

    const raw = await req.text();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(raw, sig, secret);
    } catch (err: any) {
      return NextResponse.json({ error: `invalid signature: ${err?.message || String(err)}` }, { status: 400 });
    }

    async function handlePaid(orderId?: string | null, txnId?: string | null, totalCents?: number | null) {
      if (!orderId) return;
      try {
        await finalizeOrderAndInventory({
          orderId,
          provider: "stripe",
          externalId: txnId || undefined,
          totalCents: typeof totalCents === "number" ? totalCents : undefined,
        });
      } catch (e) {
        console.error("[stripe webhook] finalize error", e);
      }
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const orderId = (s.metadata as any)?.orderId || s.client_reference_id || null;
        const txnId =
          (typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id) || s.id;
        const total = typeof s.amount_total === "number" ? s.amount_total : null;
        await handlePaid(orderId, txnId, total);
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = (pi.metadata as any)?.orderId || null;
        await handlePaid(orderId, pi.id, pi.amount_received ?? null);
        break;
      }
      case "charge.succeeded": {
        const ch = event.data.object as Stripe.Charge;
        const orderId = (ch.metadata as any)?.orderId || null;
        const txnId = (ch.payment_intent as string) || ch.id;
        await handlePaid(orderId, txnId, ch.amount ?? null);
        break;
      }
      default:
        // ok
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("[stripe webhook] error", e);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}