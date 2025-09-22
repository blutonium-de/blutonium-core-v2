// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";                   // ✅ Default-Import (richtig)
import { stripe } from "../../../lib/stripe";

type CartItem = { id: string; qty: number };

type Product = {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  priceEUR: number;
  slug: string;
};

export const dynamic = "force-dynamic";

async function loadProducts(origin: string): Promise<Product[]> {
  const r = await fetch(`${origin}/api/products`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Products API ${r.status}`);
  const j = await r.json();
  return j.products || [];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cart: CartItem[] = Array.isArray(body?.items) ? body.items : [];
    if (cart.length === 0) {
      return NextResponse.json({ error: "Warenkorb leer" }, { status: 400 });
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

    const products = await loadProducts(origin);
    const map = new Map(products.map((p) => [p.id, p] as const));

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] =
      cart
        .map((ci) => {
          const p = map.get(ci.id);
          if (!p) return null;
          const qty = Math.max(1, Math.floor(ci.qty || 1));
          return {
            quantity: qty,
            price_data: {
              currency: "eur",
              unit_amount: Math.round(p.priceEUR * 100),
              product_data: {
                name: p.title,
                description: p.subtitle || undefined,
                images: p.image ? [new URL(p.image, origin).toString()] : [],
              },
            },
          };
        })
        .filter(Boolean) as unknown as Stripe.Checkout.SessionCreateParams.LineItem[];

    if (line_items.length === 0) {
      return NextResponse.json({ error: "Ungültige Artikel" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      success_url: `${origin}/de/merch/success`,
      cancel_url: `${origin}/de/merch/cancel`,
      shipping_address_collection: {
        allowed_countries: ["DE", "AT", "CH", "NL", "BE", "LU"],
      },
      billing_address_collection: "auto",
      automatic_tax: { enabled: false },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("checkout error:", err);
    return NextResponse.json(
      { error: err?.message || "Checkout failed" },
      { status: 500 }
    );
  }
}