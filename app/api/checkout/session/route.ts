// app/api/checkout/session/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe, appOriginFromHeaders, absFrom } from "@/lib/stripe";
import type Stripe from "stripe";

type RegionCode = "AT" | "EU";

type Body = {
  orderId: string;
  region?: RegionCode;
  shipping?: { name: string; amountEUR: number; carrier: string } | null;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Nur https-URLs an Stripe geben */
function httpsOrNull(u: string | null): string | null {
  if (!u) return null;
  try {
    const url = new URL(u);
    if (url.protocol === "https:") return url.toString();
    return null;
  } catch {
    return null;
  }
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

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items
      .filter((it) => it.product && it.qty > 0 && it.unitPrice > 0 && it.product.active !== false)
      .map((it) => {
        const p = it.product!;
        const name =
          p.productName && p.productName.trim().length > 0
            ? p.productName
            : `${p.artist ?? ""}${p.artist && p.trackTitle ? " – " : ""}${p.trackTitle ?? p.slug}`;

        // unitPrice ist bei dir INT (Cent). Sicherstellen:
        const unitAmount = Math.round(Number(it.unitPrice));
        if (!Number.isFinite(unitAmount) || unitAmount < 1) {
          throw new Error(`Invalid unit amount for product ${p.id}: ${it.unitPrice}`);
        }

        const imgAbs = httpsOrNull(absFrom(req, p.image || ""));

        return {
          quantity: it.qty,
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: {
              name,
              images: imgAbs ? [imgAbs] : [], // nur https
              metadata: { productId: p.id, orderId: order.id },
            },
          },
        };
      });

    // Versand als eigenes Line Item (nur wenn > 0 EUR)
    if (shipping && Number.isFinite(shipping.amountEUR) && shipping.amountEUR > 0) {
      const shipAmount = Math.round(Number(shipping.amountEUR) * 100);
      if (shipAmount > 0) {
        line_items.push({
          quantity: 1,
          price_data: {
            currency,
            unit_amount: shipAmount,
            product_data: {
              name: `Versand – ${shipping.name}`,
              images: [absFrom(req, "/blutonium-records-shop-logo.png")], // https
              metadata: { productId: "shipping", orderId: order.id },
            },
          },
        });
      }
    }

    if (line_items.length === 0)
      return NextResponse.json({ error: "No purchasable items" }, { status: 400 });

    const origin = appOriginFromHeaders(req);
    const successUrl = `${origin}/de/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${encodeURIComponent(
      order.id
    )}`;
    const cancelUrl = `${origin}/de/cart`;

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        line_items,
        // nice to have: Email mitgeben (falls vorhanden)
        customer_email: order.email || undefined,
        metadata: {
          orderId: order.id,
          region,
          shipping_name: shipping?.name || "",
          shipping_eur: String(shipping?.amountEUR ?? 0),
        },
        payment_intent_data: {
          metadata: { orderId: order.id },
        },
      });
    } catch (err: any) {
      // Stripe-Fehler sauber nach vorne geben
      const msg = err?.raw?.message || err?.message || "Stripe error";
      console.error("[stripe.sessions.create] ", msg, err?.raw);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: session.id, url: session.url }, { status: 200 });
  } catch (e: any) {
    console.error("[checkout/session POST] error:", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}