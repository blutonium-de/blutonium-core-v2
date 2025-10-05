// app/api/checkout/session/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe, appOriginFromHeaders } from "@/lib/stripe";
import type Stripe from "stripe";

type RegionCode = "AT" | "EU";

type Body = {
  orderId: string;
  region?: RegionCode;
  shipping?: { name: string; amountEUR: number; carrier: string } | null;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Absolute URL bauen (Stripe-Bilder brauchen absolute HTTPS-URLs) */
function abs(path: string) {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path, base + "/").toString();
}

export async function POST(req: Request) {
  try {
    const { orderId, region = "AT", shipping }: Body = await req.json();
    if (!orderId) return NextResponse.json({ error: "orderId missing" }, { status: 400 });

    // Order + Items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                productName: true,
                artist: true,
                trackTitle: true,
                priceEUR: true,
                image: true,
                active: true,
              },
            },
          },
        },
      },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if ((order.items?.length || 0) === 0)
      return NextResponse.json({ error: "Order has no items" }, { status: 400 });

    // Marker: wir gehen zu Stripe
    try {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentProvider: "stripe" as any } as any,
      });
    } catch {}

    const currency = (order.currency || "EUR").toLowerCase();

    // ⬇️ Explizit typisieren – verhindert erneute TS-Fehler
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items
      .filter((it) => it.product && it.qty > 0 && it.unitPrice > 0 && it.product.active !== false)
      .map((it) => {
        const p = it.product!;
        const name =
          p.productName && p.productName.trim().length > 0
            ? p.productName
            : `${p.artist ?? ""}${p.artist && p.trackTitle ? " – " : ""}${p.trackTitle ?? p.slug}`;

        const imgAbs = p.image ? abs(p.image) : null;

        return {
          quantity: it.qty,
          price_data: {
            currency,
            // OrderItem.unitPrice bereits in Cent gespeichert
            unit_amount: it.unitPrice,
            product_data: {
              name,
              // ⬅️ Immer ein Array liefern (Stripe typings verlangen string[])
              images: imgAbs ? [imgAbs] : [],
              metadata: { productId: p.id, orderId: order.id },
            },
          },
        };
      });

    // Versand als eigenes Line Item (nur wenn > 0 EUR)
    if (shipping && Number.isFinite(shipping.amountEUR) && shipping.amountEUR > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency,
          unit_amount: Math.round(Number(shipping.amountEUR) * 100),
          product_data: {
            name: `Versand – ${shipping.name}`,
            // ⬅️ WICHTIG: images IMMER da (leer oder Logo)
            images: [abs("/blutonium-records-shop-logo.png")],
            metadata: { productId: "shipping", orderId: order.id },
          },
        },
      });
    }

    if (line_items.length === 0)
      return NextResponse.json({ error: "No purchasable items" }, { status: 400 });

    const origin = appOriginFromHeaders(req);
    const successUrl = `${origin}/de/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${encodeURIComponent(
      order.id
    )}`;
    const cancelUrl = `${origin}/de/cart`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items,
      metadata: {
        orderId: order.id,
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