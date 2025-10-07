// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe, appOriginFromHeaders } from "@/lib/stripe";
import { chooseBestShipping, type RegionCode } from "@/lib/shipping";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  region?: RegionCode; // "AT" | "EU"
  items: Array<{ id: string; qty: number }>;
  // optional: Käuferdaten, falls du sie schon hier mitschicken willst
  email?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  zip?: string;
  city?: string;
  country?: string;
  phone?: string;
};

export async function POST(req: Request) {
  try {
    const { region: regionRaw, items, ...buyer }: Body = await req.json();
    const region: RegionCode = regionRaw === "EU" ? "EU" : "AT";

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart empty" }, { status: 400 });
    }

    // Produkte laden
    const ids = items.map((i) => i.id);
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, active: true },
      select: {
        id: true,
        slug: true,
        productName: true,
        artist: true,
        trackTitle: true,
        priceEUR: true,
        image: true,
        stock: true,
        isDigital: true,
        weightGrams: true,
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    // Warenkorb validieren & clampen
    const safe = items
      .map((row) => {
        const p = byId.get(row.id);
        if (!p || !p.active) return null;
        const max = Math.max(0, Number(p.stock ?? 0));
        const qty = Math.min(Math.max(1, Number(row.qty || 1)), max);
        if (qty <= 0) return null;

        const title = p.productName?.trim()
          ? p.productName
          : `${p.artist ?? ""}${p.artist && p.trackTitle ? " – " : ""}${p.trackTitle ?? p.slug}`;

        return {
          id: p.id,
          title,
          unitAmount: Math.round(Number(p.priceEUR) * 100), // Cent
          image: /^https?:\/\//i.test(p.image) ? p.image : undefined,
          qty,
          isDigital: !!p.isDigital,
          weightGrams: Math.max(0, Number(p.weightGrams ?? 150)) * qty,
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        title: string;
        unitAmount: number;
        image?: string;
        qty: number;
        isDigital: boolean;
        weightGrams: number;
      }>;

    if (safe.length === 0) {
      return NextResponse.json({ error: "No purchasable items" }, { status: 400 });
    }

    // Summen
    const subtotalCents = safe.reduce((s, it) => s + it.unitAmount * it.qty, 0);
    const subtotalEUR = subtotalCents / 100;
    const totalWeightGrams = safe.reduce((s, it) => s + (it.isDigital ? 0 : it.weightGrams), 0);
    const hasPhysical = safe.some((i) => !i.isDigital);

    // Versand berechnen (nur bei physischen Artikeln)
    const shippingQuote = hasPhysical
      ? chooseBestShipping({ region, totalWeightGrams, subtotalEUR })
      : null;
    const shippingCents = Math.round((shippingQuote?.amountEUR ?? 0) * 100);

    // ===== 1) Order in DB anlegen (status=open) =====
    const order = await prisma.order.create({
      data: {
        email: buyer.email ?? null,
        firstName: buyer.firstName ?? null,
        lastName: buyer.lastName ?? null,
        address: buyer.address ?? null,
        zip: buyer.zip ?? null,
        city: buyer.city ?? null,
        country: buyer.country ?? null,
        phone: buyer.phone ?? null,

        paymentProvider: "stripe",
        currency: "EUR",
        status: "open",
        amountTotal: subtotalCents + shippingCents,

        items: {
          create: [
            ...safe.map((it) => ({
              qty: it.qty,
              unitPrice: it.unitAmount,
              product: { connect: { id: it.id } },
            })),
            ...(shippingCents > 0
              ? [{
                  qty: 1,
                  unitPrice: shippingCents,
                  productId: null, // Versand-Position ohne Produkt
                }] as const
              : []),
          ],
        },
      },
      select: { id: true },
    });

    // ===== 2) Stripe Session erzeugen + Order-ID mitgeben =====
    // Stripe-LineItems (optional – nur für schöne Anzeige im Checkout)
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      ...safe.map((it) => ({
        quantity: it.qty,
        price_data: {
          currency: "eur",
          unit_amount: it.unitAmount,
          product_data: {
            name: it.title,
            images: it.image ? [it.image] : [],
            metadata: { productId: it.id },
          },
        },
      })),
      ...(shippingCents > 0
        ? [{
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: shippingCents,
              product_data: {
                name: `Versand (${shippingQuote?.name ?? "Standard"})`,
                images: [],
                metadata: { productId: "shipping" },
              },
            },
          }] as const
        : []),
    ];

    const origin = appOriginFromHeaders(req);
    const successUrl = `${origin}/de/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl  = `${origin}/de/cart`;

    const payload = safe.map((it) => ({ id: it.id, qty: it.qty, unit: it.unitAmount }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items,
      client_reference_id: order.id,        // <— Fallback für Webhook
      metadata: {
        orderId: order.id,                  // <— Primärschlüssel für Webhook
        payload: JSON.stringify(payload),
        region,
        subtotalEUR: String(subtotalEUR),
        totalWeightGrams: String(totalWeightGrams),
        shippingEUR: String(shippingQuote ? shippingQuote.amountEUR : 0),
        shippingName: shippingQuote?.name || "",
      },
    });

    return NextResponse.json({ ok: true, id: session.id, url: session.url }, { status: 200 });
  } catch (e: any) {
    console.error("[checkout POST] error:", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}