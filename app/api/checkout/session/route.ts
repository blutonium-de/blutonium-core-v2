// app/api/checkout/session/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  // Wichtig: auf installierte Stripe-Version abstimmen
  apiVersion: "2025-08-27.basil",
});

/**
 * POST /api/checkout/session
 * Body: { items: Array<{ productId: string; qty: number }> }
 *  - Baut eine Stripe Checkout Session
 *  - Legt die Zeilenpreise in Cent fest
 *  - Schreibt die (ProduktId, Menge, Preis) in metadata.payload für /confirm
 */
export async function POST(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const items: Array<{ productId: string; qty: number }> = Array.isArray(body?.items)
      ? body.items
      : [];

    if (items.length === 0) {
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }

    // Produkte aus DB laden
    const ids = items.map((i) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        productName: true,
        artist: true,
        trackTitle: true,
        priceEUR: true,
        stock: true,
        active: true,
        isDigital: true,
      },
    });

    const byId = new Map(dbProducts.map((p) => [p.id, p]));
    const safeItems = items
      .map((it) => {
        const p = byId.get(it.productId);
        if (!p || !p.active) return null;
        const max = Math.max(0, p.stock ?? 0);
        const qty = Math.min(Math.max(1, Number(it.qty) || 1), Math.max(1, max));
        const title =
          p.productName && p.productName.trim().length > 0
            ? p.productName
            : `${p.artist ?? ""}${p.artist && p.trackTitle ? " – " : ""}${p.trackTitle ?? ""}`.trim() || "Artikel";
        const unitCents = Math.round(Number(p.priceEUR || 0) * 100);

        if (!Number.isFinite(unitCents) || unitCents <= 0) return null;

        return {
          id: p.id,
          title,
          qty,
          unitCents,
        };
      })
      .filter(Boolean) as Array<{ id: string; title: string; qty: number; unitCents: number }>;

    if (safeItems.length === 0) {
      return NextResponse.json({ error: "No purchasable items" }, { status: 400 });
    }

    // Stripe Line Items
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = safeItems.map((it) => ({
      quantity: it.qty,
      price_data: {
        currency: "eur",
        unit_amount: it.unitCents,
        product_data: {
          name: it.title,
        },
      },
      adjustable_quantity: {
        enabled: false,
      },
    }));

    // Für /confirm stock-Reduktion: kompaktes Payload in metadata
    const payloadForConfirm = safeItems.map((it) => ({
      id: it.id,
      qty: it.qty,
      unit: it.unitCents,
    }));

    // URLs
    const origin =
      process.env.PUBLIC_BASE_URL ||
      (typeof process !== "undefined" && process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const success_url = `${origin}/de/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${origin}/de/cart`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url,
      cancel_url,
      currency: "eur",
      metadata: {
        payload: JSON.stringify(payloadForConfirm),
      },
      // Optional: Rechnungs-/Lieferadresse erzwingen
      // billing_address_collection: "required",
      // shipping_address_collection: { allowed_countries: ["AT", "DE", "CH", "NL", "BE", "FR", "IT", "ES"] },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ id: session.id, url: session.url }, { status: 200 });
  } catch (e: any) {
    console.error("[checkout session]", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}