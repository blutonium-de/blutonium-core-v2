import Stripe from 'stripe'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  // Stripe nur benutzen, wenn wirklich konfiguriert (damit der Build nicht crasht)
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    return NextResponse.json(
      { ok: false, reason: 'Stripe not configured (missing STRIPE_SECRET_KEY)' },
      { status: 200 } // bewusst 200, damit statische Build-Checks nicht fehlschlagen
    )
  }

  const stripe = new Stripe(key, {
    apiVersion: '2025-08-27.basil',
  } as any)

  const { items = [], customerEmail } = await req.json()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: customerEmail,
    automatic_tax: { enabled: true },
    billing_address_collection: 'required',
    shipping_address_collection: {
      allowed_countries: ['AT','DE','CH','BE','NL','FR','IT','ES','PL','CZ','DK','SE','NO','GB','US','CA','AU'],
    },
    tax_id_collection: { enabled: true },
    shipping_options: [
      process.env.STRIPE_RATE_EU_STANDARD ? { shipping_rate: process.env.STRIPE_RATE_EU_STANDARD } : undefined,
      process.env.STRIPE_RATE_WORLD ? { shipping_rate: process.env.STRIPE_RATE_WORLD } : undefined,
    ].filter(Boolean) as any[],
    line_items: (items || []).map((i: any) => ({ price: i.priceId, quantity: i.quantity })),
    success_url: `${process.env.SITE_URL || ''}/shop/success?sid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.SITE_URL || ''}/shop/cart`,
  })

  return NextResponse.json({ url: session.url })
}
