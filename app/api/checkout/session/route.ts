// app/api/checkout/session/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { stripe, appOriginFromHeaders } from "../../../../lib/stripe";

type RegionCode = "AT" | "EU";
type Body = {
  region?: RegionCode;
  items: Array<{ id: string; qty: number }>;
  shipping?: { name: string; amountEUR: number; carrier: string } | null;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { region = "AT", items, shipping }: Body = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart empty" }, { status: 400 });
    }

    const ids = items.map((i) => i.id);
    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true, slug: true, productName: true, artist: true, trackTitle: true,
        priceEUR: true, image: true, stock: true, active: true, isDigital: true,
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const safe = items.map(({ id, qty }) => {
      const p = byId.get(id);
      if (!p || !p.active) return null;
      const max = Math.max(0, Number(p.stock ?? 0));
      const clamped = Math.min(Math.max(1, Number(qty || 1)), max);
      if (clamped <= 0) return null;

      const title =
        p.productName && p.productName.trim().length > 0
          ? p.productName
          : `${p.artist ?? ""}${p.artist && p.trackTitle ? " – " : ""}${p.trackTitle ?? p.slug}`;

      return {
        id: p.id,
        title,
        qty: clamped,
        unitAmount: Math.round(Number(p.priceEUR) * 100),
        image: /^https?:\/\//i.test(p.image) ? p.image : undefined,
        isDigital: !!p.isDigital,
      };
    }).filter(Boolean) as Array<{
      id: string; title: string; qty: number; unitAmount: number; image?: string; isDigital: boolean;
    }>;

    if (safe.length === 0) {
      return NextResponse.json({ error: "No purchasable items" }, { status: 400 });
    }

    // Stripe Line Items (Produkte)
    const line_items = safe.map((it) => ({
      quantity: it.qty,
      price_data: {
        currency: "eur",
        unit_amount: it.unitAmount,
        product_data: {
          name: it.title,
          images: it.image ? [it.image] : undefined,
          metadata: { productId: it.id },
        },
      },
    }));

    // Versand als zusätzliches Line Item
    if (shipping && Number.isFinite(shipping.amountEUR) && shipping.amountEUR > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: Math.round(shipping.amountEUR * 100),
          product_data: {
            name: `Versand – ${shipping.name}`,
            images: [],
            metadata: { productId: "shipping" }, // <-- nur productId erlaubt
          },
        },
      });
    }

    const origin = appOriginFromHeaders(req);
    const successUrl = `${origin}/de/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl  = `${origin}/de/cart`;

    // payload für /confirm
    const payload = safe.map((it) => ({ id: it.id, qty: it.qty, unit: it.unitAmount }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items,
      metadata: {
        payload: JSON.stringify(payload),
        region,
        shipping_name: shipping?.name || "",
        shipping_eur: String(shipping?.amountEUR ?? 0),
      },
    });

    return NextResponse.json({ ok: true, id: session.id, url: session.url }, { status: 200 });
  } catch (e: any) {
    console.error("[checkout/session POST] error:", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}