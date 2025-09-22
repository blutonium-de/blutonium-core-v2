// lib/shipping.ts
// Zonen, Carrier, Gewichts-Staffeln & Preise + "Versandkostenfrei ab X €"

export type Zone = "AT" | "DE" | "EU" | "WORLD"
export type Carrier = "POST_DHL" | "DPD" | "GLS"

export const CARRIERS: Record<Carrier, string> = {
  POST_DHL: "Post/DHL",
  DPD: "DPD",
  GLS: "GLS",
}

// Land -> Zone (vereinfachte Abbildung; erweiterbar)
export const COUNTRY_TO_ZONE: Record<string, Zone> = {
  AT: "AT",
  DE: "DE",
  BE: "EU", NL: "EU", LU: "EU", IT: "EU", FR: "EU", ES: "EU", PT: "EU",
  DK: "EU", SE: "EU", FI: "EU", NO: "EU", IE: "EU", PL: "EU", CZ: "EU",
  SK: "EU", SI: "EU", HR: "EU", HU: "EU", RO: "EU", BG: "EU", GR: "EU",
  EE: "EU", LV: "EU", LT: "EU", MT: "EU", CY: "EU",
  CH: "EU", // CH separat behandeln? -> Zone anpassen, falls gewünscht
}

const BRACKETS = [500, 1000, 2000, 5000] // Gramm-Grenzen: ≤500, ≤1000, ≤2000, ≤5000

// Preise in Cent pro Carrier/Zone/Gewichts-Stufe (4 Stufen entsprechend BRACKETS)
const RATES: Record<Carrier, Record<Zone, number[]>> = {
  POST_DHL: {
    AT:    [  399,  599,  899, 1299],
    DE:    [  699,  899, 1299, 1799],
    EU:    [  899, 1299, 1799, 2499],
    WORLD: [ 1499, 1999, 2999, 4999],
  },
  DPD: {
    AT:    [  499,  699,  999, 1399],
    DE:    [  799,  999, 1399, 1899],
    EU:    [ 1099, 1499, 1999, 2799],
    WORLD: [ 1999, 2599, 3499, 5499],
  },
  GLS: {
    AT:    [  449,  649,  949, 1349],
    DE:    [  749,  949, 1349, 1849],
    EU:    [  999, 1399, 1899, 2699],
    WORLD: [ 1899, 2499, 3399, 5299],
  },
}

// ---- Hilfsfunktionen

export function resolveZone(countryCode: string): Zone {
  const cc = (countryCode || "").toUpperCase()
  return COUNTRY_TO_ZONE[cc] ?? "WORLD"
}

export function weightBracketIndex(totalGrams: number): number {
  for (let i = 0; i < BRACKETS.length; i++) {
    if (totalGrams <= BRACKETS[i]) return i
  }
  return BRACKETS.length - 1
}

export function shippingPriceFor(carrier: Carrier, zone: Zone, totalGrams: number): number {
  const idx = weightBracketIndex(totalGrams)
  return RATES[carrier][zone][idx]
}

// ---- Cart/Produkte Typen (leicht generisch gehalten)

export type CartItem = { id: string; qty: number }
export type ProductLike = {
  id: string
  priceEUR: number
  weightGrams?: number | null
  isDigital?: boolean
}

// Summiert Gewicht aller physischen Produkte (Digital & „kostenloser Versand“ via weight=0 werden ignoriert)
export function computeCartWeight(items: CartItem[], productMap: Map<string, ProductLike>): number {
  let grams = 0
  for (const it of items) {
    const p = productMap.get(it.id)
    if (!p) continue
    const isDigital = !!p.isDigital
    const w = Math.max(0, Math.floor(Number(p.weightGrams ?? 0)))
    if (!isDigital && w > 0) grams += w * Math.max(1, Math.floor(it.qty || 1))
  }
  return grams
}

// Netto-Warenwert (in Cent) – ohne Versand
export function computeMerchSubtotalCents(items: CartItem[], productMap: Map<string, ProductLike>): number {
  let cents = 0
  for (const it of items) {
    const p = productMap.get(it.id)
    if (!p) continue
    cents += Math.round(p.priceEUR * 100) * Math.max(1, Math.floor(it.qty || 1))
  }
  return cents
}

export type ShippingComputeParams = {
  items: CartItem[]
  products: ProductLike[] | Map<string, ProductLike>
  destinationCountry: string // z.B. "AT", "DE", "NL", "CH", ...
  carrier: Carrier
  freeShippingMinEUR?: number // z.B. 100 -> ab 100 € versandfrei
}

export type ShippingResult = {
  zone: Zone
  totalGrams: number
  shippingCents: number
  freeApplied: boolean
  thresholdCents: number
}

// Hauptroutine: berechnet Versandkosten unter Berücksichtigung der Schwelle
export function computeShipping(params: ShippingComputeParams): ShippingResult {
  const map = params.products instanceof Map
    ? params.products
    : new Map(params.products.map(p => [p.id, p] as const))

  const zone = resolveZone(params.destinationCountry)
  const totalGrams = computeCartWeight(params.items, map)
  const subtotalCents = computeMerchSubtotalCents(params.items, map)

  const thresholdCents = Math.max(0, Math.round((params.freeShippingMinEUR ?? 0) * 100))
  const freeApplied = thresholdCents > 0 && subtotalCents >= thresholdCents

  const shippingCents = freeApplied
    ? 0
    : (totalGrams > 0 ? shippingPriceFor(params.carrier, zone, totalGrams) : 0)

  return { zone, totalGrams, shippingCents, freeApplied, thresholdCents }
}