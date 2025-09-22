// app/api/shipping/route.ts
import { NextResponse } from "next/server"
import type { Product } from "../../../lib/types"
import {
  priceFor,
  resolveZone,
  labelForBracket,
  BRACKETS,
  type Carrier,
} from "../../../lib/shipping"

type CartItem = { id: string; qty: number }

export const dynamic = "force-dynamic"

// Gleiche Freigrenze wie im Checkout verwenden (falls du dort was änderst, hier auch)
const FREE_SHIPPING_MIN_EUR = 100

async function loadProducts(origin: string): Promise<Product[]> {
  const r = await fetch(`${origin}/api/products`, { cache: "no-store" })
  if (!r.ok) throw new Error(`Products API ${r.status}`)
  const j = await r.json()
  return j.products || []
}

// Optional: GET liefert Konfiguration (z.B. für UI)
export async function GET(req: Request) {
  return NextResponse.json({
    brackets: BRACKETS,              // Gewichtsstufen (g)
    freeShippingMinEUR: FREE_SHIPPING_MIN_EUR,
  })
}

// POST: Versandvorschau für Warenkorb
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const items: CartItem[] = Array.isArray(body?.items) ? body.items : []
    const country: string = (body?.country || "AT").toUpperCase()
    const carrier: Carrier = (body?.carrier || "POST_DHL") as Carrier

    if (items.length === 0) {
      return NextResponse.json({ error: "Warenkorb leer" }, { status: 400 })
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
    const products = await loadProducts(origin)
    const map = new Map(products.map(p => [p.id, p] as const))

    // Summe Warenwert & Gewicht bestimmen
    let totalEUR = 0
    let totalGrams = 0
    for (const it of items) {
      const p = map.get(it.id)
      if (!p) continue
      const qty = Math.max(1, Math.floor(it.qty || 1))
      totalEUR += (p.priceEUR ?? 0) * qty

      // digitale Items zählen 0g, fehlende Gewichte = 0
      const grams = p.isDigital ? 0 : (p.weightGrams ?? 0)
      totalGrams += grams * qty
    }

    const zone = resolveZone(country)

    const thresholdCents = Math.round(FREE_SHIPPING_MIN_EUR * 100)
    const freeApplied = Math.round(totalEUR * 100) >= thresholdCents

    const shippingCents = freeApplied
      ? 0
      : priceFor(carrier, zone, totalGrams)

    const bracketLabel = labelForBracket(totalGrams)

    return NextResponse.json({
      ok: true,
      zone,
      carrier,
      totalEUR,
      totalGrams,
      bracketLabel,
      shippingCents,
      freeApplied,
      thresholdCents,
    })
  } catch (err: any) {
    console.error("shipping preview error:", err)
    return NextResponse.json(
      { error: err?.message || "Shipping preview failed" },
      { status: 500 },
    )
  }
}