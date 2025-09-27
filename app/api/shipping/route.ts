// lib/shipping.ts
/**
 * Versandlogik (einfach & robust)
 */

export type RegionCode = "AT" | "EU" | "WORLD";
export type CarrierCode = "POST" | "DPD" | "GLS";

export type ShippingOption = {
  carrier: CarrierCode;
  name: string;
  region: RegionCode;
  maxWeightGrams: number;
  amountEUR: number;
};

export type ShippingQuote = {
  name: string;
  region: RegionCode;
  carrier: CarrierCode;
  amountEUR: number;
  weightGrams: number;
  freeByThreshold: boolean;
};

const TABLE: Record<RegionCode, ShippingOption[]> = {
  AT: [
    { carrier: "POST", name: "Österreichische Post (AT)", region: "AT", maxWeightGrams: 500,  amountEUR: 4.5 },
    { carrier: "POST", name: "Österreichische Post (AT)", region: "AT", maxWeightGrams: 2000, amountEUR: 6.9 },
    { carrier: "POST", name: "Österreichische Post (AT)", region: "AT", maxWeightGrams: 5000, amountEUR: 8.9 },
    { carrier: "POST", name: "Österreichische Post (AT)", region: "AT", maxWeightGrams: 10000, amountEUR: 11.9 },

    { carrier: "DPD",  name: "DPD (AT)",                   region: "AT", maxWeightGrams: 2000, amountEUR: 6.5 },
    { carrier: "DPD",  name: "DPD (AT)",                   region: "AT", maxWeightGrams: 5000, amountEUR: 8.5 },
    { carrier: "DPD",  name: "DPD (AT)",                   region: "AT", maxWeightGrams: 10000, amountEUR: 10.9 },

    { carrier: "GLS",  name: "GLS (AT)",                   region: "AT", maxWeightGrams: 2000, amountEUR: 6.9 },
    { carrier: "GLS",  name: "GLS (AT)",                   region: "AT", maxWeightGrams: 5000, amountEUR: 8.9 },
    { carrier: "GLS",  name: "GLS (AT)",                   region: "AT", maxWeightGrams: 10000, amountEUR: 11.9 },
  ],
  EU: [
    { carrier: "POST", name: "Österreichische Post (EU)",  region: "EU", maxWeightGrams: 500,  amountEUR: 9.9 },
    { carrier: "POST", name: "Österreichische Post (EU)",  region: "EU", maxWeightGrams: 2000, amountEUR: 14.9 },
    { carrier: "POST", name: "Österreichische Post (EU)",  region: "EU", maxWeightGrams: 5000, amountEUR: 19.9 },
    { carrier: "POST", name: "Österreichische Post (EU)",  region: "EU", maxWeightGrams: 10000, amountEUR: 29.9 },

    { carrier: "DPD",  name: "DPD (EU)",                   region: "EU", maxWeightGrams: 2000, amountEUR: 12.9 },
    { carrier: "DPD",  name: "DPD (EU)",                   region: "EU", maxWeightGrams: 5000, amountEUR: 17.9 },
    { carrier: "DPD",  name: "DPD (EU)",                   region: "EU", maxWeightGrams: 10000, amountEUR: 24.9 },

    { carrier: "GLS",  name: "GLS (EU)",                   region: "EU", maxWeightGrams: 2000, amountEUR: 13.9 },
    { carrier: "GLS",  name: "GLS (EU)",                   region: "EU", maxWeightGrams: 5000, amountEUR: 18.9 },
    { carrier: "GLS",  name: "GLS (EU)",                   region: "EU", maxWeightGrams: 10000, amountEUR: 26.9 },
  ],
  WORLD: [
    { carrier: "POST", name: "Österreichische Post (WORLD)", region: "WORLD", maxWeightGrams: 500,  amountEUR: 14.9 },
    { carrier: "POST", name: "Österreichische Post (WORLD)", region: "WORLD", maxWeightGrams: 2000, amountEUR: 24.9 },
    { carrier: "POST", name: "Österreichische Post (WORLD)", region: "WORLD", maxWeightGrams: 5000, amountEUR: 39.9 },
    { carrier: "POST", name: "Österreichische Post (WORLD)", region: "WORLD", maxWeightGrams: 10000, amountEUR: 59.9 },
  ],
};

function getFreeThreshold(): number {
  const raw = process.env.SHOP_FREE_SHIPPING_MIN;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : 0;
}

export function getShippingOptions(params: {
  region: RegionCode;
  totalWeightGrams: number;
  subtotalEUR: number;
}): ShippingQuote[] {
  const { region, totalWeightGrams, subtotalEUR } = params;
  const freeMin = getFreeThreshold();

  const tiers = (TABLE[region] || []).filter(t => t.maxWeightGrams >= Math.max(1, totalWeightGrams));
  if (tiers.length === 0) {
    return [{
      name: "Versand wird nachträglich berechnet",
      region,
      carrier: "POST",
      amountEUR: 0,
      weightGrams: totalWeightGrams,
      freeByThreshold: false,
    }];
  }

  const free = freeMin > 0 && subtotalEUR >= freeMin;

  const byCarrier = new Map<CarrierCode, ShippingOption>();
  for (const opt of tiers) {
    const prev = byCarrier.get(opt.carrier);
    if (!prev || opt.amountEUR < prev.amountEUR) byCarrier.set(opt.carrier, opt);
  }

  const quotes: ShippingQuote[] = Array.from(byCarrier.values()).map(opt => ({
    name: opt.name,
    region,
    carrier: opt.carrier,
    amountEUR: free ? 0 : opt.amountEUR,
    weightGrams: totalWeightGrams,
    freeByThreshold: free,
  }));

  quotes.sort((a, b) => a.amountEUR - b.amountEUR);
  return quotes;
}

export function chooseBestShipping(params: {
  region: RegionCode;
  totalWeightGrams: number;
  subtotalEUR: number;
}): ShippingQuote {
  const q = getShippingOptions(params);
  return q[0];
}

/* ------------------------------------------------------------------ */
/*  Kompatibilität zu bestehendem API-Handler                          */
/* ------------------------------------------------------------------ */

// EU-Länderliste (ISO2)
const EU_ISO = new Set([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
  "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE"
]);

export function resolveZone(countryIso2?: string | null): RegionCode {
  const c = (countryIso2 || "").toUpperCase();
  if (c === "AT") return "AT";
  if (EU_ISO.has(c)) return "EU";
  return "WORLD";
}

export const BRACKETS = [
  { max: 500,    label: "bis 0,5 kg" },
  { max: 2000,   label: "bis 2 kg" },
  { max: 5000,   label: "bis 5 kg" },
  { max: 10000,  label: "bis 10 kg" },
  { max: Infinity, label: "über 10 kg" },
] as const;

export function labelForBracket(totalWeightGrams: number): string {
  const w = Math.max(0, Math.floor(totalWeightGrams));
  const b = BRACKETS.find(b => w <= b.max) || BRACKETS[BRACKETS.length - 1];
  return b.label;
}

/** Überladungen:
 *  - priceFor(weight, zone) → POST-Referenz
 *  - priceFor(carrier, zone, weight) → carrier-spezifisch
 */
export function priceFor(totalWeightGrams: number, zone: RegionCode): number;
export function priceFor(carrier: CarrierCode, zone: RegionCode, totalWeightGrams: number): number;
export function priceFor(a: number | CarrierCode, b: RegionCode, c?: number): number {
  // 2-arg: (weight, zone)
  if (typeof a === "number" && typeof c === "undefined") {
    const totalWeightGrams = a;
    const zone = b;
    const options = (TABLE[zone] || []).filter(o => o.carrier === "POST");
    const tier = options.find(o => totalWeightGrams <= o.maxWeightGrams) || options[options.length - 1];
    return tier ? tier.amountEUR : 0;
  }

  // 3-arg: (carrier, zone, weight)
  const carrier = a as CarrierCode;
  const zone = b;
  const totalWeightGrams = c as number;
  const options = (TABLE[zone] || []).filter(o => o.carrier === carrier);
  const tier = options.find(o => totalWeightGrams <= o.maxWeightGrams) || options[options.length - 1];
  return tier ? tier.amountEUR : 0;
}

/** Optional: Gesamtgewicht aus Positionen */
export function sumWeight(items: Array<{ weightGrams?: number | null; qty?: number | null }>): number {
  return items.reduce((acc, it) => {
    const w = Number(it.weightGrams ?? 0);
    const q = Number(it.qty ?? 1);
    if (Number.isFinite(w) && Number.isFinite(q)) return acc + w * q;
    return acc;
  }, 0);
}

/* Typ-Aliases für bestehende Imports */
export type Carrier = CarrierCode;
export type Region  = RegionCode;
export type Quote   = ShippingQuote;