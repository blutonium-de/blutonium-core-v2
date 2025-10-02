import { NextResponse } from "next/server";
import { paypalApi } from "@/lib/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
    console.log("[PP][capture]", id); // ← ADD

    const capture = await paypalApi(`/v2/checkout/orders/${id}/capture`, { method: "POST", body: JSON.stringify({}) });

    const pu = capture?.purchase_units?.[0];
    const cap = pu?.payments?.captures?.[0];
    console.log("[PP][capture] response", { status: capture?.status, captureStatus: cap?.status, capId: cap?.id, details: cap?.status_details || capture?.details }); // ← ADD

    return NextResponse.json({ ok: true, capture }, { status: 200 });
  } catch (e: any) {
    console.error("[PP][capture] ERROR", e?.message || e, e?.stack); // ← ADD
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}