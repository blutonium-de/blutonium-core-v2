// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "../../../../lib/stripe";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // wichtig für raw body

export async function POST(req: NextRequest) {
  try {
    const sig = req.headers.get("stripe-signature");
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!sig || !secret) {
      return NextResponse.json({ error: "missing webhook config" }, { status: 500 });
    }

    // Raw-Body lesen (KEIN req.json()!)
    const raw = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(raw, sig, secret);
    } catch (err: any) {
      return NextResponse.json({ error: `invalid signature: ${err?.message || String(err)}` }, { status: 400 });
    }

    // Helper: Order als bezahlt markieren
    async function markPaid(orderId?: string | null, txnId?: string | null) {
      if (!orderId) return;
      const data: any = {
        status: "paid",
        paidAt: new Date(),
        paymentProvider: "stripe",
        paymentMethod: "stripe",
        transactionId: txnId || undefined,
      };
      try {
        await prisma.order.update({ where: { id: orderId }, data });
      } catch {
        // falls Order noch nicht existiert o.ä. -> nicht abstürzen
      }
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId =
          (session.metadata && (session.metadata as any).orderId) ||
          session.client_reference_id ||
          null;

        const txnId =
          (typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id) ||
          session.id;

        await markPaid(orderId, txnId);
        break;
      }

      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = (pi.metadata && (pi.metadata as any).orderId) || null;
        await markPaid(orderId, pi.id);
        break;
      }

      case "charge.succeeded": {
        const charge = event.data.object as Stripe.Charge;
        const orderId = (charge.metadata && (charge.metadata as any).orderId) || null;
        await markPaid(orderId, charge.payment_intent?.toString() || charge.id);
        break;
      }

      // Weitere Events ignorieren, aber 200 antworten
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}