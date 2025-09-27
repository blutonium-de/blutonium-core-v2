// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { stripe } from "../../../lib/stripe";
import type Stripe from "stripe";
import { chooseBestShipping, type RegionCode } from "../../../lib/shipping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Cart = Record<string, { id: string; qty: number }>;

export async function POST(req: Request) {
  try {
    const origin = process.env.SITE_URL || req.headers.get("origin") || "http://localhost:3000";

    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Body muss JSON sein" }, { status: 415 }); }

    const { items, region } = (body as { items?: Cart; region?: RegionCode }) || {};
    if (!items || typeof items !== "object") {
      return NextResponse.json({ error: "Ungültiger Warenkorb" }, { status: 400 });
    }

    const regionCode: RegionCode = (region as RegionCode) || "AT";

    const ids = Object.keys(items);
    if (ids.length === 0) {
      return NextResponse.json({ error: "Warenkorb ist leer" }, { status: 400 });
    }

    const products = await prisma.product.findMany({ where: { id: { in: ids }, active: true } });
    if (products.length === 0) {
      return NextResponse.json({ error: "Keine Produkte gefunden" }, { status: 400 });
    }

    // Summen bilden
    let subtotalEUR = 0;
    let totalWeightGrams = 0;

    for (const p of products) {
      const qty = items[p.id]?.qty || 0;
      if (qty <= 0) continue;
      const price = typeof p.priceEUR === "number" ? p.priceEUR : 0;
      const w = typeof p.weightGrams === "number" ? p.weightGrams : 0;
      subtotalEUR += price * qty;
      totalWeightGrams += Math.max(0, w) * qty;
    }

    // Versand berechnen (cheapest/Best)
    const ship = chooseBestShipping({
      region: regionCode,
      totalWeightGrams,
      subtotalEUR,
    });

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // Produktzeilen
    for (const p of products) {
      const qty = items[p.id]?.qty || 0;
      if (qty <= 0) continue;

      const unitAmount = typeof p.priceEUR === "number" ? Math.round(p.priceEUR * 100) : 0;
      if (unitAmount <= 0) continue;

      const artistTitle = (p.artist ?? "") + ((p.artist && p.trackTitle) ? " – " : "") + (p.trackTitle ?? "");
      const title = (p.productName ?? artistTitle) || p.slug || "Artikel";

      let images: string[] | undefined = undefined;
      if (p.image && /^https?:\/\//i.test(p.image) && p.image.length < 2000) {
        images = [p.image];
      } else if (p.image) {
        const abs = p.image.startsWith("http") ? p.image : `${origin}${p.image.startsWith("/") ? "" : "/"}${p.image}`;
        if (abs.length < 2000) images = [abs];
      }

      line_items.push({
        quantity: qty,
        price_data: {
          currency: "eur",
          unit_amount: unitAmount,
          product_data: {
            name: title,
            images,
            metadata: { id: p.id, slug: p.slug || "", category: p.categoryCode || "" },
          },
        },
      });
    }

    // Versand hinzufügen (0, wenn Freigrenze erreicht)
    if (ship) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: Math.round(ship.amountEUR * 100),
          product_data: {
            name: ship.freeByThreshold
              ? `Versand (${ship.name}) – frei`
              : `Versand (${ship.name})`,
            metadata: {
              type: "shipping",
              region: ship.region,
              carrier: ship.carrier,
              weightGrams: String(ship.weightGrams ?? ""),
            },
          },
        },
      });
    }

    if (line_items.length === 0) {
      return NextResponse.json({ error: "Keine gültigen Positionen" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${origin}/de/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/de/merch`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    const msg = err?.message || "Checkout-Fehler";
    console.error("POST /api/checkout error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}