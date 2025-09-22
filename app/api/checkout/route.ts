// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "../../../lib/stripe";
import { computeShipping, resolveZone, type Carrier } from "../../../lib/shipping";

type CartItem = { id: string; qty: number };

type Product = {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  priceEUR: number;
  slug: string;
  // Versand-relevante Felder (kommen aus /api/products)
  weightGrams?: number | null;
  isDigital?: boolean;
};

export const dynamic = "force-dynamic";

// dieselbe Schwelle wie im Frontend verwenden:
const FREE_SHIPPING_MIN_EUR = 100;

async function loadProducts(origin: string): Promise<Product[]> {
  const r = await fetch(`${origin}/api/products`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Products API ${r.status}`);
  const j = await r.json();
  return j.products || [];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items: CartItem[] = Array.isArray(body?.items) ? body.items : [];
    const country: string = (body?.country || "AT").toUpperCase();
    const carrier: Carrier = body?.carrier || "POST_DHL";

    if (items.length === 0) {
      return NextResponse.json({ error: "Warenkorb leer" }, { status: 400 });
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const products = await loadProducts(origin);
    const map = new Map(products.map((p) => [p.id, p] as const));

    // Line Items strikt typisiert für Stripe
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = (
      items
        .map((ci) => {
          const p = map.get(ci.id);
          if (!p) return null;
          const qty = Math.max(1, Math.floor(ci.qty || 1));
          return {
            quantity: qty,
            price_data: {
              currency: "eur",
              unit_amount: Math.round(p.priceEUR * 100), // € -> Cent
              product_data: {
                name: p.title,
                description: p.subtitle || undefined,
                images: p.image ? [new URL(p.image, origin).toString()] : [],
              },
            },
          } satisfies Stripe.Checkout.SessionCreateParams.LineItem;
        })
        .filter(Boolean) as Stripe.Checkout.SessionCreateParams.LineItem[]
    );

    if (line_items.length === 0) {
      return NextResponse.json({ error: "Ungültige Artikel" }, { status: 400 });
    }

    // Versand berechnen
    const ship = computeShipping({
      items,
      products: map,
      destinationCountry: country,
      carrier,
      freeShippingMinEUR: FREE_SHIPPING_MIN_EUR,
    });

    // Stripe-Shipping-Optionen (streng typisiert)
    const shipping_options: Stripe.Checkout.SessionCreateParams.ShippingOption[] = [
      {
        shipping_rate_data: {
          display_name: ship.freeApplied
            ? `Versand (${carrier}) – versandfrei`
            : `Versand (${carrier})`,
          type: "fixed_amount",
          fixed_amount: {
            amount: ship.shippingCents, // Cent
            currency: "eur",
          },
          delivery_estimate: {
            minimum: { unit: "business_day", value: 2 },
            maximum: { unit: "business_day", value: 7 },
          },
        },
      },
    ];

    // Erlaubte Länder **mit Stripe-Typ**
    const allowedCountries: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] =
      [
        "AT",
        "DE",
        "CH",
        "BE",
        "NL",
        "LU",
        "IT",
        "FR",
        "ES",
        "PT",
        "PL",
        "CZ",
        "SK",
        "SI",
        "HU",
        "RO",
        "BG",
        "GR",
        "DK",
        "SE",
        "FI",
        "NO",
        "IE",
        "US",
        "CA",
        "AU",
        "NZ",
        "JP",
        "BR",
        "MX",
      ];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],

      line_items,

      // Adressen & Versand
      shipping_address_collection: { allowed_countries: allowedCountries },
      shipping_options,

      // Redirects
      success_url: `${origin}/de/merch/success`,
      cancel_url: `${origin}/de/merch/cancel`,

      billing_address_collection: "auto",
      automatic_tax: { enabled: false },

      // Nützliche Metadaten (für Webhook/Backoffice)
      metadata: {
        chosen_country: country,
        chosen_zone: resolveZone(country),
        chosen_carrier: carrier,
        free_applied: String(ship.freeApplied),
        shipping_cents: String(ship.shippingCents),
        threshold_cents: String(ship.thresholdCents),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("checkout error:", err);
    return NextResponse.json({ error: err?.message || "Checkout failed" }, { status: 500 });
  }
}