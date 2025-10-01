// app/api/paypal/capture-order/[id]/route.ts
import { NextResponse } from "next/server";
import { paypalApi } from "../../../../lib/paypal"; // <-- FIX: vier ../

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params?.id;
    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "missing or invalid id" }, { status: 400 });
    }

    // PayPal Capture Request
    const capture = await paypalApi(`/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    // Wichtig: Hier solltest du noch persistieren:
    // - Bestellung speichern
    // - Lagerbestand reduzieren
    // - E-Mail-Bestätigung an Käufer senden
    // ähnlich wie beim Stripe-Webhook

    return NextResponse.json(
      { ok: true, id: orderId, capture },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[paypal capture-order]", e);
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 }
    );
  }
}