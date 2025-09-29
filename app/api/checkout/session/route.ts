// app/api/checkout/session/route.ts
import { NextResponse } from "next/server";
import { stripe, appOriginFromHeaders } from "@/lib/stripe";
import { prisma } from "@/lib/db";

type BodyItem = { id: string; qty: number };

export async function POST(req: Request) {
  try {
    const { items } = (await req.json()) as { items: BodyItem[] };
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart leer" }, { status: 400 });
    }

    // Produkte holen & mappen
    const ids = items.map(i => i.id);
    const dbItems = await prisma.product.findMany({
      where: { id: { in: ids }, active: true },
      select: { id: true, productName: true, artist: true, trackTitle: true, slug: true, priceEUR: true, stock: true, image: true },
    });

    const byId = new Map(dbItems.map(d => [d.id, d]));
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const { id, qty } of items) {
      const p = byId.get(id);
      if (!p) continue;
      const max = Math.max(0, p.stock ?? 0);
      const useQty = Math.min(qty, max);
      if (useQty <= 0) continue;

      const title = p.productName?.trim().length
        ? p.productName
        : [p.artist, p.trackTitle].filter(Boolean).join(" – ") || p.slug;

      lineItems.push({
        quantity: useQty,
        price_data: {
          currency: "eur",
          unit_amount: Math.round(p.priceEUR * 100), // cents
          product_data: {
            name: title,
            images: p.image ? [p.image] : undefined,
          },
        },
      });
    }

    if (lineItems.length === 0) {
      return NextResponse.json({ error: "Keine gültigen Items" }, { status: 400 });
    }

    const origin = appOriginFromHeaders(req);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${origin}/de/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/de/cart`,
      invoice_creation: { enabled: false },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Stripe Fehler" }, { status: 500 });
  }
}