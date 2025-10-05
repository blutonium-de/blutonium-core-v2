// app/api/paypal/capture-order/[id]/route.ts
import { NextResponse } from "next/server";
import { paypalApi } from "@/lib/paypal";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

    // interne Order-ID aus Query (kommt aus deinem Checkout)
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId") || "";
    if (!orderId) return NextResponse.json({ error: "missing orderId" }, { status: 400 });

    // 1) Capture bei PayPal
    const capture = await paypalApi(`/v2/checkout/orders/${id}/capture`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    const status = capture?.status;
    const cap = capture?.purchase_units?.[0]?.payments?.captures?.[0];
    const capId = cap?.id;
    const capStatus = cap?.status;

    if (!(status === "COMPLETED" || capStatus === "COMPLETED")) {
      return NextResponse.json(
        { error: `unexpected capture status: ${status || capStatus || "unknown"}` },
        { status: 400 }
      );
    }

    // 2) Transaktion: Order auf paid + Bestände reduzieren (+ ggf. deaktivieren)
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: {
          status: "paid",
          paidAt: new Date(),
          paymentProvider: "paypal",
          paymentMethod: "paypal",
          transactionId: capId || id,
        },
        include: { items: true },
      });

      for (const it of order.items) {
        if (!it.productId || !it.qty) continue;
        const p = await tx.product.findUnique({ where: { id: it.productId }, select: { stock: true } });
        if (!p) continue;
        const newStock = Math.max(0, Number(p.stock ?? 0) - Number(it.qty));
        await tx.product.update({
          where: { id: it.productId },
          data: { stock: newStock, ...(newStock <= 0 ? { active: false } : {}) },
        });
      }
    });

    return NextResponse.json({ ok: true, capture }, { status: 200 });
  } catch (e: any) {
    console.error("[PP][capture] ERROR", e?.message || e, e?.stack);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}