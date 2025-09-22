// app/api/shipping/route.ts
import { NextResponse } from "next/server"
import products from "../../../data/products.json" assert { type: "json" }
import type { Product } from "../../../lib/types"
import {
  bestCarrierFor,
  calcShippingCents,
  resolveZone,
  BRACKETS,
  labelForBracket,
  type Carrier,
} from "../../../lib/shipping"

export const dynamic = "force-dynamic"

type CartItem = { id: string; qty: number }
type QuoteRequest = {
  country: string           // ISO-2, z.B. "AT", "DE", "CH", ...
  items: CartItem[]
  preferredCarrier?: Carrier
}

function euro(nCents: number) {
  return (nCents / 100).toFixed(2)
}

/**
 * Gewicht ableiten:
 * - falls Product.weightGrams vorhanden → nutzen
 * - heuristisch anhand von Tags/Titel:
 *    - "vinyl" → ~350 g (250 g Platte + 100 g Verpackung)
 *    - "cd" oder "doppel cd" → ~100 g (60 g + 40 g Verpackung)
 *    - "sample" (digitale Ware) → 0 g
 * - sonst konservativ ~250 g
 */
function inferWeightGrams(p: Product): number {
  // explizit hinterlegt?
  // @ts-expect-error (falls dein Product-Typ weightGrams noch nicht hat)
  if (typeof (p as any).weightGrams === "number") {
    // @ts-ignore
    return Math.max(0, Math.round((p as any).weightGrams))
  }

  const hay = `${p.title} ${p.subtitle ?? ""} ${(p.tags ?? []).join(" ")}`.toLowerCase()

  if (hay.includes("sample")) return 0
  if (hay.includes("vinyl")) return 350
  if (hay.includes("cd")) return 100

  // Default/Fallback
  return 250
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as QuoteRequest

    if (!body?.country || !Array.isArray(body?.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "country (ISO-2) und items[] werden benötigt." },
        { status: 400 }
      )
    }

    // Produkt-Lookup
    const list = (products as Product[]).filter(p => p.active)
    const map = new Map(list.map(p => [p.id, p] as const))

    // Gesamtgewicht & Zwischensummen
    let totalGrams = 0
    let itemsTotalCents = 0

    const normalized = body.items
      .map(({ id, qty }) => {
        const p = map.get(id)
        if (!p) return null
        const q = Math.max(1, Math.floor(qty || 1))
        const grams = inferWeightGrams(p) * q
        const lineCents = Math.round((p.priceEUR ?? 0) * 100) * q
        totalGrams += grams
        itemsTotalCents += lineCents
        return {
          id: p.id,
          title: p.title,
          qty: q,
          weightGramsEach: inferWeightGrams(p),
          weightGramsTotal: grams,
          linePriceCents: lineCents,
        }
      })
      .filter(Boolean) as {
        id: string
        title: string
        qty: number
        weightGramsEach: number
        weightGramsTotal: number
        linePriceCents: number
      }[]

    if (normalized.length === 0) {
      return NextResponse.json({ error: "Keine gültigen Artikel gefunden." }, { status: 400 })
    }

    const countryISO2 = body.country.toUpperCase()
    const zone = resolveZone(countryISO2)

    // Beste Versand-Option (oder preferredCarrier, wenn gesetzt & verfügbar)
    const best = bestCarrierFor(countryISO2, totalGrams, body.preferredCarrier)
    const shippingCents = best.priceCents
    const grandTotalCents = itemsTotalCents + shippingCents

    // Antwort
    return NextResponse.json({
      ok: true,
      country: countryISO2,
      zone,
      items,
      weight: {
        totalGrams,
        bracketLabel: labelForBracket(totalGrams),
        brackets: BRACKETS, // zur Info
      },
      pricing: {
        itemsTotalCents,
        shippingCents,
        grandTotalCents,
        itemsTotalEUR: euro(itemsTotalCents),
        shippingEUR: euro(shippingCents),
        grandTotalEUR: euro(grandTotalCents),
        currency: "EUR",
      },
      shipping: {
        carrier: best.carrier,
        label: best.label,
        bracketGrams: best.bracket,
      },
    })
  } catch (err: any) {
    console.error("shipping error:", err)
    return NextResponse.json({ error: err?.message || "Shipping failed" }, { status: 500 })
  }
}