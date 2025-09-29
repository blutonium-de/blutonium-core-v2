// app/api/checkout/session/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { stripe, appOriginFromHeaders } from "../../../../lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RegionCode = "AT" | "EU" | "WORLD";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const items: Array<{ id: string; qty: number }> = Array.isArray(body?.items) ? body.items : [];
    const region = (body?.region as RegionCode) || "AT"; // ⬅️ Region aus Client (Warenkorb)

    if (items.length === 0) return NextResponse.json({ error: "Cart empty" }, { status: 400 });

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
          unitAmount: Math.round(Number(p.priceEUR) * 100),
          image: p.image || undefined,
          qty,
          isDigital: !!p.isDigital,
          weight: Math.max(0, Number(p.weightGrams ?? 0)) * qty,
        };
      })
      .filter(Boolean) as Array<{
        id: string; title: string; unitAmount: number; image?: string; qty: number; isDigital: boolean; weight: number;
      }>;

    if (safe.length === 0) return NextResponse.json({ error: "No purchasable items" }, { status: 400 });

    const origin = appOriginFromHeaders(req);
    const successUrl = `${origin}/de/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl  = `${origin}/de/cart`;

    // Region → erlaubte Länder
    const allowed_countries =
      region === "AT"
        ? ["AT"]
        : region === "EU"
        ? ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","GB"]
        : undefined; // WORLD → keine Einschränkung

    const line_items = safe.map((it) => ({
      quantity: it.qty,
      price_data: {
        currency: "eur",
        unit_amount: it.unitAmount,
        product_data: {
          name: it.title,
          images: it.image && /^https?:\/\//i.test(it.image) ? [it.image] : undefined,
          metadata: { productId: it.id },
        },
      },
    }));

    const hasPhysical = safe.some((i) => !i.isDigital);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items,
      metadata: {
        payload: JSON.stringify(
          safe.map((s) => ({ id: s.id, qty: s.qty, unit: s.unitAmount }))
        ),
        region,
      },
      ...(hasPhysical
        ? {
            shipping_address_collection: allowed_countries
              ? { allowed_countries }
              : undefined,
          }
        : {}),
    });

    return NextResponse.json({ ok: true, id: session.id, url: session.url }, { status: 200 });
  } catch (e: any) {
    console.error("[checkout/session POST] error:", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}