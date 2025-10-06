// app/api/paypal/capture-order/[id]/route.ts
import { NextResponse } from "next/server";
import { paypalApi } from "@/lib/paypal";
import { finalizeOrderAndInventory } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId") || "";
    if (!orderId) {
      return NextResponse.json({ error: "missing orderId" }, { status: 400 });
    }

    const capture = await paypalApi(`/v2/checkout/orders/${id}/capture`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    const status = capture?.status;
    const cap = capture?.purchase_units?.[0]?.payments?.captures?.[0];
    const capId = cap?.id;
    const capStatus = cap?.status;

    if (status === "COMPLETED" || capStatus === "COMPLETED") {
      await finalizeOrderAndInventory({
        orderId,
        provider: "paypal",
        externalId: capId || id,
        // PayPal total bekommt man hier nicht zuverlässig → weglassen ok
      });
      return NextResponse.json({ ok: true, capture }, { status: 200 });
    }

    return NextResponse.json(
      { error: `unexpected capture status: ${status || capStatus || "unknown"}` },
      { status: 400 }
    );
  } catch (e: any) {
    console.error("[PP][capture] ERROR", e?.message || e, e?.stack);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}