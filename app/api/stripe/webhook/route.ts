// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "../../../../lib/stripe";
import { prisma } from "@/lib/db";
import { finalizeOrderAndInventory } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ---- helpers ---------------------------------------------------------------

// Idempotent: löscht bestehende Versand-Items (productId = null) und legt GENAU EINS neu an.
// amountTotal wird aus allen Items frisch berechnet, um jede Drift zu vermeiden.
async function upsertShipping(orderId: string, cents?: number | null, name?: string | null) {
  const shipCents = Math.max(0, Number(cents ?? 0) | 0);
  const shipName  = (name ?? "").trim() || null;

  // Wenn nichts Sinnvolles übergeben wurde, einfach alle Versand-Zeilen entfernen und Total neu rechnen.
  await prisma.$transaction(async (tx) => {
    // immer: vorhandene Versand-Zeilen weg (idempotent bei Mehrfachzustellung / Race Conditions)
    await tx.orderItem.deleteMany({ where: { orderId, productId: null } });

    // optional: genau EINE neue Zeile anlegen, falls > 0
    if (shipCents > 0) {
      await tx.orderItem.create({
        data: { orderId, productId: null, qty: 1, unitPrice: shipCents },
      });
    }

    // Gesamtsumme frisch berechnen (Produkte + Versand)
    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: { qty: true, unitPrice: true },
    });
    const newTotal = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);

    await tx.order.update({
      where: { id: orderId },
      data: {
        amountTotal: newTotal,
        // optional: shippingName in eigener Spalte speichern, wenn vorhanden
        // shippingName: shipName,
      },
    });
  });
}

// aus Session: bevorzugt unsere metadata (shipping_eur/name), sonst total_details/rate-name
function shippingFromSession(session: Stripe.Checkout.Session) {
  const metaEUR  = Number((session.metadata as any)?.shipping_eur ?? NaN);
  const metaName = (session.metadata as any)?.shipping_name?.toString()?.trim() || null;
  if (Number.isFinite(metaEUR) && metaEUR > 0) {
    return { cents: Math.round(metaEUR * 100), name: metaName };
  }
  const amountShipping = session.total_details?.amount_shipping ?? 0;
  const rateName = (session.shipping_options?.[0]?.shipping_rate as any)?.display_name || null;
  return { cents: amountShipping, name: rateName };
}

// (Bewusst) NICHT MEHR verwendet, um Doppel-Schreibungen zu vermeiden.
// Fallback-Reader lasse ich drin, falls du sie später brauchen willst.
function shippingFromPI(pi: Stripe.PaymentIntent) {
  const eur  = Number((pi.metadata as any)?.shipping_eur ?? NaN);
  const name = (pi.metadata as any)?.shipping_name?.toString()?.trim() || null;
  if (Number.isFinite(eur) && eur > 0) {
    return { cents: Math.round(eur * 100), name };
  }
  return { cents: 0, name: null };
}
function shippingFromCharge(ch: Stripe.Charge) {
  const eur  = Number((ch.metadata as any)?.shipping_eur ?? NaN);
  const name = (ch.metadata as any)?.shipping_name?.toString()?.trim() || null;
  if (Number.isFinite(eur) && eur > 0) {
    return { cents: Math.round(eur * 100), name };
  }
  return { cents: 0, name: null };
}

// ---- webhook ---------------------------------------------------------------

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

    switch (event.type) {
      // ✅ NUR HIER pflegen wir Versand & Items (idempotent)
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId =
          (session.metadata && (session.metadata as any).orderId) ||
          session.client_reference_id || null;
        if (!orderId) return NextResponse.json({ received: true });

        prisma.order.update({ where: { id: orderId }, data: { paymentProvider: "stripe" as any } }).catch(() => {});

        // Versand robust setzen (löschen + eine Zeile anlegen)
        try {
          const s = shippingFromSession(session);
          await upsertShipping(orderId, s.cents, s.name);
        } catch (e) {
          console.warn("[wh] upsert shipping from session failed:", (e as any)?.message || e);
        }

        const txnId =
          (typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id) || session.id;

        await finalizeOrderAndInventory({
          orderId,
          provider: "stripe",
          externalId: txnId,
          totalCents: session.amount_total ?? undefined,
        });

        return NextResponse.json({ received: true });
      }

      // ⚠️ Diese Events werden weiter akzeptiert, aber verändern KEINE Positionen/Versand mehr.
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = (pi.metadata && (pi.metadata as any).orderId) || null;
        if (!orderId) return NextResponse.json({ received: true });

        prisma.order.update({ where: { id: orderId }, data: { paymentProvider: "stripe" as any } }).catch(() => {});

        // KEIN upsertShipping hier! (verhindert Doppel-Zeilen bei mehrfacher Zustellung)
        await finalizeOrderAndInventory({
          orderId,
          provider: "stripe",
          externalId: pi.id,
          totalCents: (pi.amount_received ?? pi.amount) ?? undefined,
        });
        return NextResponse.json({ received: true });
      }

      case "charge.succeeded": {
        const charge = event.data.object as Stripe.Charge;
        const orderId = (charge.metadata && (charge.metadata as any).orderId) || null;
        if (!orderId) return NextResponse.json({ received: true });

        prisma.order.update({ where: { id: orderId }, data: { paymentProvider: "stripe" as any } }).catch(() => {});

        // KEIN upsertShipping hier!
        await finalizeOrderAndInventory({
          orderId,
          provider: "stripe",
          externalId: (charge.payment_intent?.toString() || charge.id),
          totalCents: charge.amount ?? undefined,
        });
        return NextResponse.json({ received: true });
      }

      default:
        return NextResponse.json({ received: true });
    }
  } catch (e: any) {
    console.error("[stripe/webhook] ERROR", e?.message || e, e?.stack);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}