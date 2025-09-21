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

// Shop
export type Product = {
  id: string
  slug: string
  title: string
  subtitle?: string
  priceEUR: number
  currency?: "EUR"
  image: string
  tags?: string[]
  active: boolean
  // Stripe später:
  stripePriceId?: string | null
}