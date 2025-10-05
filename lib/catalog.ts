// lib/catalog.ts
export type CategoryCode = "bv" | "sv" | "bcd" | "scd" | "bhs" | "ss"

export const CATEGORY_MAP: Record<CategoryCode, string> = {
  bv:  "Blutonium Vinyls",
  sv:  "Sonstige Vinyls",
  bcd: "Blutonium CDs",
  scd: "Sonstige CDs",
  bhs: "Blutonium Hardstyle Samples",
  ss:  "Sonstiges & Specials",
}

export type ProductFormat =
  | "CD Album"
  | "Maxi CD"
  | "1CD Compilation"
  | "2CD Compilation"
  | "4CD Compilation"
  | "Maxi Vinyl"
  | "Album Vinyl LP"
  | "Album Vinyl 2LP"
  | "DVD"
  | "Blu-ray Disc"
  | "Sonstiges"

export const FORMAT_DEFAULT_WEIGHT: Record<ProductFormat, number> = {
  "CD Album":           120,
  "Maxi CD":             80,
  "1CD Compilation":    120,
  "2CD Compilation":    180,
  "4CD Compilation":    340,
  "Maxi Vinyl":         250,
  "Album Vinyl LP":     250,
  "Album Vinyl 2LP":    400,
  "DVD":                150,
  "Blu-ray Disc":       120,
  "Sonstiges":            0, // vom Benutzer einzutragen
}

export const CONDITIONS = ["Neu", "Neuwertig", "Gebraucht", "Starke Gebrauchsspuren", "OK"] as const
export type Condition = typeof CONDITIONS[number]