import { NextResponse } from "next/server";
import { paypalApi } from "../../../../../lib/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    if (!orderId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const capture = await paypalApi(`/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    // TODO: Hier (wie beim Stripe-Webhook) Bestellung speichern, Bestand reduzieren, E-Mail etc.
    return NextResponse.json({ ok: true, capture }, { status: 200 });
  } catch (e: any) {
    console.error("[paypal capture-order]", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}