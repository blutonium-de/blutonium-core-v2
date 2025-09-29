// app/api/checkout/webhook/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
// import { prisma } from "@/lib/db"; // später für Orders

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature") || "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!secret) return NextResponse.json({ error: "No webhook secret" }, { status: 500 });

  const raw = await req.text();
  try {
    const event = stripe.webhooks.constructEvent(raw, sig, secret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        // TODO: Order speichern, E-Mail triggern, Bestand reduzieren, …
        break;
      }
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Webhook error" }, { status: 400 });
  }
}

export const config = {
  api: { bodyParser: false }, // Stripe braucht den Raw-Body
} as const;