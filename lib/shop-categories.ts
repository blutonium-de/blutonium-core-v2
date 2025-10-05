// lib/shop-categories.ts

export const CATEGORY_LABELS = {
  bv:  "Blutonium Vinyls",
  sv:  "Sonstige Vinyls",
  bcd: "Blutonium CDs",
  scd: "Sonstige CDs",
  bhs: "Blutonium Hardstyle Samples",
  ss:  "Sonstiges & Specials",
} as const;

export type CategoryCode = keyof typeof CATEGORY_LABELS;

export function labelForCategory(code: CategoryCode): string {
  return CATEGORY_LABELS[code];
}

// Beispiel-Produkt-Typ (kannst du bei Bedarf in API oder Frontend nutzen)
export type Product = {
  id: string;
  title: string;
  slug: string;
  image: string;
  priceEUR: number;
  weightGrams?: number | null;
  isDigital?: boolean;
  category: CategoryCode;
};