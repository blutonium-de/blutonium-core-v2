// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import type Stripe from "stripe";                   // ✅ Default-Type-Import
import { stripe } from "../../../../lib/stripe";    // ✅ relativer Import

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // wichtig für raw body (Webhooks)

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature") ?? "";
  let event: Stripe.Event;

  // Rohdaten lesen (kein JSON parsen!)
  const payload = await req.text();

  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET!;
    event = stripe.webhooks.constructEvent(payload, sig, secret);
  } catch (err: any) {
    console.error("❌ Webhook Verify Error:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
          limit: 100,
        });

        console.log("✅ Zahlung abgeschlossen:", {
          sessionId: session.id,
          amount_total: session.amount_total,
          currency: session.currency,
          email: session.customer_details?.email,
          name: session.customer_details?.name,
          lineItems: lineItems.data.map((li) => ({
            name: li.description,
            qty: li.quantity,
            amount_total: li.amount_total,
          })),
          metadata: session.metadata,
        });
        break;
      }

      case "checkout.session.async_payment_failed":
      case "checkout.session.expired":
        console.log("ℹ️ Session nicht erfolgreich:", event.type);
        break;

      default:
        console.log("ℹ️ Unhandled event:", event.type);
    }

    return new NextResponse("ok", { status: 200 });
  } catch (err: any) {
    console.error("❌ Webhook Handler Error:", err);
    return new NextResponse("handler error", { status: 500 });
  }
}