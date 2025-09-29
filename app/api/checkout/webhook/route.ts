// app/api/checkout/webhook/route.ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = headers().get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "No webhook secret" }, { status: 500 });
  }

  const raw = await req.text();
  try {
    const event = stripe.webhooks.constructEvent(raw, sig, secret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        // TODO: Order speichern, Lager reduzieren, E-Mail, etc.
        break;
      }
      default:
        // andere Events optional behandeln
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Webhook error" },
      { status: 400 }
    );
  }
}