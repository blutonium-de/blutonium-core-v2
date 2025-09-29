// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { stripe, appOriginFromHeaders } from "../../../lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/checkout
 * body: { items: Array<{ id: string; qty: number }> }
 */
export async function POST(req: Request) {
  try {
    const { items } = await req.json();
    const list: Array<{ id: string; qty: number }> = Array.isArray(items) ? items : [];
    if (list.length === 0) return NextResponse.json({ error: "Cart empty" }, { status: 400 });

    // Produkte laden
    const ids = list.map((i) => i.id);
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
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    // Warenkorb validieren
    const safeItems = list
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
          image: p.image || undefined,
          qty,
          isDigital: !!p.isDigital,
        };
      })
      .filter(Boolean) as Array<{
        id: string; title: string; unitAmount: number; image?: string; qty: number; isDigital: boolean;
      }>;

    if (safeItems.length === 0) return NextResponse.json({ error: "No purchasable items" }, { status: 400 });

    const origin = appOriginFromHeaders(req);
    const successUrl = `${origin}/de/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl  = `${origin}/de/cart`;

    // Payload für spätere Bestandsreduktion in /confirm
    const payload = safeItems.map((it) => ({ id: it.id, qty: it.qty, unit: it.unitAmount }));

    // Nur echte http(s)-Bilder an Stripe geben (keine data: URLs!)
    const httpUrl = (u?: string) => (u && /^https?:\/\//i.test(u) ? u : undefined);

    const line_items = safeItems.map((it) => ({
      quantity: it.qty,
      price_data: {
        currency: "eur",
        unit_amount: it.unitAmount,
        product_data: {
          name: it.title,
          images: httpUrl(it.image) ? [httpUrl(it.image)!] : undefined,
          metadata: { productId: it.id },
        },
      },
    }));

    const hasPhysical = safeItems.some((i) => !i.isDigital);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items,
      metadata: { payload: JSON.stringify(payload) },
      ...(hasPhysical
        ? { shipping_address_collection: { allowed_countries: ["DE", "AT", "CH", "NL", "BE", "FR", "IT", "ES", "GB"] } }
        : {}),
    });

    return NextResponse.json({ ok: true, id: session.id, url: session.url }, { status: 200 });
  } catch (e: any) {
    console.error("[checkout POST] error:", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}