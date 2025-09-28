// app/api/checkout/confirm/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { stripe } from "../../../../lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/checkout/confirm?session_id=cs_xxx
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = (searchParams.get("session_id") || "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "missing session_id" }, { status: 400 });
  }

  try {
    // doppelte Verarbeitung vermeiden
    const existing = await prisma.order.findFirst({ where: { stripeId: sessionId } });
    if (existing) {
      return NextResponse.json({ ok: true, already: true }, { status: 200 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return NextResponse.json({ error: "session not found" }, { status: 404 });
    }

    // Payload (id/qty/unit in Cent) aus metadata
    let payload: Array<{ id: string; qty: number; unit: number }> = [];
    try {
      const raw = (session.metadata?.payload as string) || "[]";
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        payload = arr
          .map((x) => ({ id: String(x.id), qty: Number(x.qty), unit: Number(x.unit) }))
          .filter((x) => x.id && Number.isFinite(x.qty) && x.qty > 0 && Number.isFinite(x.unit));
      }
    } catch {}

    if (payload.length === 0) {
      return NextResponse.json({ error: "no payload" }, { status: 400 });
    }

    // Bestellung + Bestandsreduktion in einer Transaktion
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          stripeId: session.id,
          status: "paid",
          amountTotal: session.amount_total ?? payload.reduce((s, it) => s + it.unit * it.qty, 0),
          email: (session.customer_details?.email as string) || null,
        },
      });

      for (const it of payload) {
        const p = await tx.product.findUnique({ where: { id: it.id } });
        if (!p) continue;

        const newStock = Math.max(0, (p.stock ?? 0) - it.qty);
        await tx.product.update({
          where: { id: p.id },
          data: {
            stock: newStock,
            active: newStock > 0 ? p.active : false,
          },
        });

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: p.id,
            qty: it.qty,
            unitPrice: it.unit, // in CENT (passt zu deiner Orders-UI)
          },
        });
      }

      return order.id;
    });

    return NextResponse.json({ ok: true, orderId: result }, { status: 200 });
  } catch (e: any) {
    console.error("[checkout confirm]", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}