// lib/shipping.ts
/**
 * Versandlogik (einfach & robust):
 * - Regionen: "AT" | "EU"   (kein WORLD mehr)
 * - Carrier: "POST" | "DPD" | "GLS"
 * - Preise sind Beispiel-/Startwerte, leicht anpassbar
 *
 * Gewichtseinheit: Gramm
 * Preiseinheit: EUR
 */

export type RegionCode = "AT" | "EU";
export type CarrierCode = "POST" | "DPD" | "GLS";

export type ShippingOption = {
  carrier: CarrierCode;
  name: string;              // Anzeigename (mit Region)
  region: RegionCode;
  maxWeightGrams: number;    // Obergrenze dieses Tiers
  amountEUR: number;         // Bruttopreis in EUR
};

export type ShippingQuote = {
  name: string;         // z. B. "Österreichische Post (AT)"
  region: RegionCode;
  carrier: CarrierCode;
  amountEUR: number;    // 0 wenn Freigrenze erreicht
  weightGrams: number;  // gesamtes Sendungsgewicht
  freeByThreshold: boolean;
};

// Basistarife (leicht editierbar)
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
};

// Default-Freigrenze (falls ENV fehlt)
const DEFAULT_FREE_THRESHOLD = 50;

/** Freigrenze aus ENV (SHOP_FREE_SHIPPING_MIN) – Fallback: 50 € */
function getFreeThreshold(): number {
  const raw = process.env.SHOP_FREE_SHIPPING_MIN;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : DEFAULT_FREE_THRESHOLD; // 0 = keine Freigrenze aktiv
}

export function getShippingOptions(params: {
  region: RegionCode;
  totalWeightGrams: number;
  subtotalEUR: number;
}): ShippingQuote[] {
  const { region, totalWeightGrams, subtotalEUR } = params;
  const freeMin = getFreeThreshold();

  // passende Tiers
  const tiers = (TABLE[region] || []).filter(t => t.maxWeightGrams >= Math.max(1, totalWeightGrams));
  if (tiers.length === 0) {
    // über 10 kg → erstmal pauschal nicht berechnet (kannst du nachpflegen)
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

  // pro Carrier die günstigste Stufe für das Gewicht
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

  // nach Preis sortieren
  quotes.sort((a, b) => a.amountEUR - b.amountEUR);
  return quotes;
}

export function chooseBestShipping(params: {
  region: RegionCode;
  totalWeightGrams: number;
  subtotalEUR: number;
}): ShippingQuote {
  const q = getShippingOptions(params);
  // nimm günstigste Option
  return q[0];
}

/* ------------------------------------------------------------------ */
/*  Kompatibilitäts-Exports für bestehende API-Imports                 */
/*  (priceFor, resolveZone, labelForBracket, BRACKETS)                 */
/* ------------------------------------------------------------------ */

// EU-Länderliste (ISO2)
const EU_ISO = new Set([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
  "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE"
]);

/** Land → RegionCode (AT/EU)
 *  Hinweis: Da nur EU versendet wird, mappen wir Nicht-EU automatisch auf "EU".
 *  (Im UI lässt du ohnehin nur AT/EU auswählen.)
 */
export function resolveZone(countryIso2?: string | null): RegionCode {
  const c = (countryIso2 || "").toUpperCase();
  if (c === "AT") return "AT";
  if (EU_ISO.has(c)) return "EU";
  return "EU";
}

/** Generische Brackets nur zur Anzeige/Beschriftung */
export const BRACKETS = [
  { max: 500,    label: "bis 0,5 kg" },
  { max: 2000,   label: "bis 2 kg" },
  { max: 5000,   label: "bis 5 kg" },
  { max: 10000,  label: "bis 10 kg" },
  { max: Infinity, label: "über 10 kg" },
] as const;

/** Liefert die Bracket-Beschriftung für ein Gewicht */
export function labelForBracket(totalWeightGrams: number): string {
  const w = Math.max(0, Math.floor(totalWeightGrams));
  const b = BRACKETS.find(b => w <= b.max) || BRACKETS[BRACKETS.length - 1];
  return b.label;
}

/** Preis in EUR für Gewicht (g) + Zone (nimmt POST-Tarif als Referenz) */
export function priceFor(totalWeightGrams: number, zone: RegionCode): number {
  const w = Math.max(0, Math.floor(totalWeightGrams));
  const options = (TABLE[zone] || []).filter(o => o.carrier === "POST");
  const tier = options.find(o => w <= o.maxWeightGrams) || options[options.length - 1];
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

/* ---------- Typ-Aliases für bestehende Imports ---------- */
export type Carrier = CarrierCode;
export type Region  = RegionCode;
export type Quote   = ShippingQuote;