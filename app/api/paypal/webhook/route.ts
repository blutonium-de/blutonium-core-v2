import { NextResponse } from "next/server";
import { paypalApi } from "@/lib/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Verifiziert die PayPal-Signatur gemäß:
 * https://developer.paypal.com/docs/api/webhooks/#verify-webhook-signature
 */
async function verifySignature(req: Request, body: any) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID || "";
  if (!webhookId) throw new Error("PAYPAL_WEBHOOK_ID missing");

  const headers = req.headers;
  const transmissionId   = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const certUrl          = headers.get("paypal-cert-url");
  const authAlgo         = headers.get("paypal-auth-algo");
  const transmissionSig  = headers.get("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    throw new Error("Missing PayPal verification headers");
  }

  const res = await paypalApi("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: webhookId,
      webhook_event: body,
    }),
  });

  return res?.verification_status === "SUCCESS";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body || !body.event_type) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }

    // 🔐 Signatur checken
    const ok = await verifySignature(req, body);
    if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 400 });

    // 💡 Events behandeln
    const type = String(body.event_type);
    switch (type) {
      case "CHECKOUT.ORDER.APPROVED": {
        const orderId = body?.resource?.id;
        console.log("📦 CHECKOUT.ORDER.APPROVED", orderId);
        break;
      }
      case "PAYMENT.CAPTURE.COMPLETED": {
        const captureId = body?.resource?.id;
        const orderId   = body?.resource?.supplementary_data?.related_ids?.order_id;
        const amount    = body?.resource?.amount?.value;
        const currency  = body?.resource?.amount?.currency_code;
        console.log("✅ PAYMENT.CAPTURE.COMPLETED", { orderId, captureId, amount, currency });

        // TODO:
        // - Bestellung in DB als bezahlt markieren (idempotent!)
        // - Lagerbestand reduzieren
        // - Bestätigungsmail versenden
        break;
      }
      case "PAYMENT.CAPTURE_DENIED":
      case "PAYMENT.CAPTURE_REFUNDED":
      case "PAYMENT.CAPTURE_REVERSED": {
        console.warn("⚠️ Capture event:", type, body?.resource?.id);
        // TODO: entsprechend handeln
        break;
      }
      default: {
        console.log("[PP][webhook] event", type, body?.resource?.id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[PP][webhook error]", err);
    return NextResponse.json({ error: err?.message || "webhook error" }, { status: 500 });
  }
}