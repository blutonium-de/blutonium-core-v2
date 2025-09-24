// lib/shop-categories.ts

export const CATEGORY_LABELS = {
  bv:  "Blutonium Vinyls",
  sv:  "Sonstige Vinyls",
  bcd: "Blutonium CDs",
  scd: "Sonstige CDs",
  bhs: "Blutonium Hardstyle Samples",
  ss:  "Sonstiges & Specials",
} as const

export type CategoryCode = keyof typeof CATEGORY_LABELS

export function labelForCategory(code: CategoryCode): string {
  return CATEGORY_LABELS[code]
}

// → Beispiel-Produkt-Typ (so kannst du's in /data oder API verwenden)
export type Product = {
  id: string
  title: string
  slug: string
  image: string
  priceEUR: number
  weightGrams?: number | null
  isDigital?: boolean
  // HIER ordnest du zu:
  category: CategoryCode
}