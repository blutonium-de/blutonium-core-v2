// lib/types.ts
export type Artist = {
  id: string
  name: string
  image?: string | null
  spotifyUrl?: string
  appleUrl?: string
  beatportUrl?: string
  followersTotal?: number
  genres?: string[]
}

export type Track = {
  id: string
  title: string
  isRadioEdit?: boolean
  previewUrl?: string | null
  spotifyUrl?: string
}

export type Release = {
  id: string
  year: number
  releaseDate?: string | null
  title: string
  type: "album" | "single" | "compilation"
  label?: string | null
  coverUrl?: string | null
  artists: { id: string; name: string; url?: string }[]
  tracks?: Track[]
  spotifyUrl?: string
  appleUrl?: string
  beatportUrl?: string
  catalogNumber?: string | null
  credits?: string[]
}

// --------------------------------------
// Shop
// --------------------------------------

export type ProductImage = {
  full500: string   // Pfad zu 500x500
  thumb250: string  // Pfad zu 250x250
}

export type Product = {
  id: string
  slug: string
  title: string
  subtitle?: string
  priceEUR: number
  currency?: "EUR"
  image: string                      // Hauptbild (500x500)
  images?: ProductImage[]            // weitere Bilder
  tags?: string[]
  active: boolean

  // Stripe (optional)
  stripePriceId?: string | null

  // Zusatzfelder Shop
  artist?: string | null
  trackTitle?: string | null
  format?:
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
  year?: number | null
  upcEan?: string | null
  articleNumber?: string             // automatisch generiert
  categoryCode?: "bv" | "sv" | "bcd" | "scd" | "bhs" | "ss"
  weightGrams?: number | null
  condition?: "Neu" | "Neuwertig" | "Gebraucht" | "Starke Gebrauchsspuren" | "OK"

  // Für digitale Produkte (z.B. Samples)
  isDigital?: boolean
}