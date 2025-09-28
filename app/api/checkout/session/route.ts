// app/api/checkout/session/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

type BodyItem = { productId: string; qty: number };

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY fehlt in den ENV Variablen." },
        { status: 500 }
      );
    }

    const origin = req.nextUrl.origin;
    const body = (await req.json()) as { items: BodyItem[] };

    const items = Array.isArray(body?.items) ? body.items : [];
    const byId = new Map<string, number>(); // productId -> qty
    for (const it of items) {
      const q = Math.max(1, Math.floor(Number(it.qty) || 1));
      const id = String(it.productId || "");
      if (!id) continue;
      byId.set(id, (byId.get(id) || 0) + q);
    }
    const ids = [...byId.keys()];
    if (ids.length === 0) {
      return NextResponse.json({ error: "Keine Positionen." }, { status: 400 });
    }

    // Produkte laden (nur aktive, Stock > 0)
    const prods = await prisma.product.findMany({
      where: { id: { in: ids }, active: true, stock: { gt: 0 } },
      select: {
        id: true,
        slug: true,
        productName: true,
        artist: true,
        trackTitle: true,
        image: true,
        priceEUR: true,
        stock: true,
      },
    });

    if (prods.length === 0) {
      return NextResponse.json({ error: "Produkte nicht verfügbar." }, { status: 400 });
    }

    // Stripe Line Items bauen, Mengen am Bestand clampen
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const normalized: { productId: string; qty: number; unitPrice: number }[] = [];

    for (const p of prods) {
      const want = byId.get(p.id) || 0;
      const max = Math.max(0, p.stock ?? 0);
      const qty = Math.min(max, Math.max(0, want));
      if (qty <= 0) continue;

      const title =
        (p.productName && p.productName.trim()) ||
        `${p.artist ?? ""}${p.artist && p.trackTitle ? " – " : ""}${p.trackTitle ?? p.slug}`;

      const unitAmount = Math.round(Number(p.priceEUR || 0) * 100);

      line_items.push({
        quantity: qty,
        price_data: {
          currency: "eur",
          unit_amount: unitAmount,
          product_data: {
            name: title,
            images: p.image ? [p.image] : undefined,
            metadata: { productId: p.id, slug: p.slug },
          },
        },
      });

      normalized.push({ productId: p.id, qty, unitPrice: unitAmount });
    }

    if (line_items.length === 0) {
      return NextResponse.json(
        { error: "Keine verfügbaren Mengen (Bestand erschöpft?)." },
        { status: 400 }
      );
    }

    // Meta für spätere Bestandsreduktion
    const metadata: Record<string, string> = {
      items: JSON.stringify(normalized), // [{productId, qty, unitPrice(cents)}...]
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${origin}/de/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/de/cart`,
      metadata,
      // Optional – E-Mail/Kundenadresse abfragen:
      // customer_email: undefined,
      // billing_address_collection: "required",
      // shipping_address_collection: { allowed_countries: ["DE", "AT", "CH", "NL", "BE", "LU"] },
    });

    return NextResponse.json({ id: session.id }, { status: 200 });
  } catch (e: any) {
    console.error("[checkout/session POST]", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}