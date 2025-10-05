import { NextResponse } from "next/server";
import { paypalApi } from "@/lib/paypal";
import { finalizeOrderPaid } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

    // orderId aus Query lesen (kommt aus PayPalCheckout)
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId") || "";
    if (!orderId) {
      return NextResponse.json({ error: "missing orderId" }, { status: 400 });
    }

    console.log("[PP][capture] start", { id, orderId });

    // 1) PayPal Capture
    const capture = await paypalApi(`/v2/checkout/orders/${id}/capture`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    const status = capture?.status;
    const cap = capture?.purchase_units?.[0]?.payments?.captures?.[0];
    const capId = cap?.id;
    const capStatus = cap?.status;

    console.log("[PP][capture] response", { status, capStatus, capId });

    // 2) Nur bei erfolgreichem Capture Lager/Order updaten
    if (status === "COMPLETED" || capStatus === "COMPLETED") {
      await finalizeOrderPaid({
        orderId,
        provider: "paypal",
        txnId: capId || id,
      });
    } else {
      return NextResponse.json(
        { error: `unexpected capture status: ${status || capStatus || "unknown"}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, capture }, { status: 200 });
  } catch (e: any) {
    console.error("[PP][capture] ERROR", e?.message || e, e?.stack);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}