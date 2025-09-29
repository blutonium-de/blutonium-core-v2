// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { stripe, appOriginFromHeaders } from "../../../lib/stripe";
import {
  getShippingOptions,
  resolveZone, // falls du später Land->Region machen willst
  sumWeight,
  type RegionCode,
} from "../../../lib/shipping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  region?: RegionCode;                 // "AT" | "EU" | "WORLD" (vom Client)
  items: Array<{ id: string; qty: number }>;
};

export async function POST(req: Request) {
  try {
    const { region: regionRaw, items }: Body = await req.json();
    const region: RegionCode = (regionRaw || "AT") as RegionCode;

    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: "Cart empty" }, { status: 400 });

    // Produkte laden
    const ids = items.map((i) => i.id);
    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        slug: true,
        productName: true,
        artist: true,
        trackTitle: true,
        priceEUR: true,
        image: true,
        stock: true,
        active: true,
        isDigital: true,
        weightGrams: true,
      },
    });

    const byId = new Map(products.map((p) => [p.id, p]));

    // Warenkorb validieren + bereinigen
    const safe = items
      .map((row) => {
        const p = byId.get(row.id);
        if (!p || !p.active) return null;
        const max = Math.max(0, Number(p.stock ?? 0));
        const qty = Math.min(Math.max(1, Number(row.qty || 1)), max);
        if (qty <= 0) return null;

        const title =
          p.productName && p.productName.trim().length > 0
            ? p.productName
            : `${p.artist ?? ""}${p.artist && p.trackTitle ? " – " : ""}${p.trackTitle ?? p.slug}`;

        return {
          id: p.id,
          title,
          unitAmount: Math.round(Number(p.priceEUR) * 100), // Cent
          image: /^https?:\/\//i.test(p.image) ? p.image : undefined, // nur http(s) für Stripe
          qty,
          isDigital: !!p.isDigital,
          weightGrams: Math.max(0, Number(p.weightGrams ?? 150)) * qty, // Default 150g/Vinyl
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

    if (safe.length === 0)
      return NextResponse.json({ error: "No purchasable items" }, { status: 400 });

    // Summen
    const subtotalEUR = safe.reduce((s, it) => s + (it.unitAmount / 100) * it.qty, 0);
    const totalWeightGrams = safe.reduce((s, it) => s + it.weightGrams, 0);

    // Versandoptionen anhand Region/Gewicht/Zwischensumme
    const quotes = getShippingOptions({
      region,
      totalWeightGrams,
      subtotalEUR,
    });

    // Stripe Line Items
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

    const origin = appOriginFromHeaders(req);
    const successUrl = `${origin}/de/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/de/cart`;

    const hasPhysical = safe.some((i) => !i.isDigital);

    // Stripe shipping_options aus deinen Quotes
    const shipping_options =
      hasPhysical
        ? quotes.map((q) => ({
            shipping_rate_data: {
              display_name: q.name,
              type: "fixed_amount",
              fixed_amount: { currency: "eur", amount: Math.round(q.amountEUR * 100) },
              metadata: {
                region: q.region,
                carrier: q.carrier,
                weightGrams: String(q.weightGrams),
                freeByThreshold: String(q.freeByThreshold),
              },
            },
          }))
        : undefined;

    // Address collection (wenn physisch)
    const allowed_countries = hasPhysical
      ? region === "AT"
        ? ["AT"]
        : region === "EU"
        ? [
            "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
            "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE"
          ]
        : ["US","CA","AU","NZ","JP","GB","NO","CH","BR","MX","SG","HK","AE","ZA","IL","TR","TH","PH","MY","ID","IN","KR","TW","AR","CL","PE"] // grobe Auswahl
      : undefined;

    // Payload für spätere Bestandsreduktion
    const payload = safe.map((it) => ({ id: it.id, qty: it.qty, unit: it.unitAmount }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items,
      metadata: {
        payload: JSON.stringify(payload),
        region,
        subtotalEUR: String(subtotalEUR),
        totalWeightGrams: String(totalWeightGrams),
      },
      ...(hasPhysical
        ? {
            shipping_address_collection: { allowed_countries },
            shipping_options,
          }
        : {}),
    });

    return NextResponse.json({ ok: true, id: session.id, url: session.url }, { status: 200 });
  } catch (e: any) {
    console.error("[checkout POST] error:", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}