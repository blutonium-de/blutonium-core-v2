// app/api/webhook/route.ts
import { NextResponse } from "next/server";
import { stripe } from "../../../lib/stripe";
import { prisma } from "../../../lib/db";
import type Stripe from "stripe";
import { getTransport, hasMailerEnv } from "../../../lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Schnelltest: erreichbar?
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  if (!secret) return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });

  // RAW body (Stripe verlangt das)
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: any) {
    console.error("[webhook] signature verification failed:", err?.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // LineItems inkl. Product & metadata holen
      const items = await stripe.checkout.sessions.listLineItems(session.id, {
        expand: ["data.price.product"],
        limit: 100,
      });

      const amountTotal = session.amount_total ?? 0;
      const currency = (session.currency ?? "eur").toLowerCase();
      const email = session.customer_details?.email ?? null;
      const paid =
        session.payment_status === "paid" ||
        session.status === "complete";
      const status = paid ? "paid" : "open";

      // Dein Order-Modell hat "stripeId" -> upsert daran
      const order = await prisma.order.upsert({
        where: { stripeId: session.id },
        create: {
          stripeId: session.id,
          email: email || undefined,
          amountTotal,
          currency,
          status,
        },
        update: {
          email: email || undefined,
          amountTotal,
          currency,
          status,
        },
      });

      // Alte Positionen löschen und neu schreiben
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } });

      // In dein Schema mappen: qty + unitPrice, productId optional
      const toCreate = items.data.map((li) => {
        const qty = li.quantity ?? 1;
        const subtotal = li.amount_subtotal ?? 0;
        const unit = Math.round(subtotal / Math.max(qty, 1));

        const prod = li.price?.product as Stripe.Product | null;
        const isShipping = prod?.metadata?.type === "shipping";
        const productId = isShipping ? null : (prod?.metadata?.id || null);

        return {
          orderId: order.id,
          productId: productId ?? undefined, // optional
          qty,
          unitPrice: unit, // cents
        };
      });

      if (toCreate.length) {
        await prisma.orderItem.createMany({ data: toCreate });
      }

      console.log("[webhook] stored order:", order.id, "items:", toCreate.length);
      // --- E-Mail (non-blocking)
(async () => {
  try {
    if (!hasMailerEnv()) return;
    const toCustomer = email || "";
    const t = getTransport();

    // Kunde
    if (toCustomer) {
      await t.sendMail({
        from: process.env.MAIL_FROM!,
        to: toCustomer,
        subject: "Deine Blutonium Records Bestellung",
        text: `Danke für deine Bestellung!\n\nBestellnummer: ${order.id}\nGesamt: ${(amountTotal/100).toFixed(2)} ${currency.toUpperCase()}\nStatus: ${status}\n\nWir melden uns, sobald der Versand erfolgt.`,
      });
    }

    // Intern
    if (process.env.ADMIN_EMAIL) {
      await t.sendMail({
        from: process.env.MAIL_FROM!,
        to: process.env.ADMIN_EMAIL,
        subject: `Neue Bestellung #${order.id.slice(-6)} (${status})`,
        text: `Order: ${order.id}\nEmail: ${email ?? "-"}\nGesamt: ${(amountTotal/100).toFixed(2)} ${currency.toUpperCase()}\nItems: ${toCreate.length}`,
      });
    }
  } catch (e) {
    console.error("[mail] send error", e);
  }
})();
    }

    // Immer 200 zurück → Stripe retried nicht
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[webhook] handler error:", err?.message);
    return NextResponse.json({ received: true });
  }
}