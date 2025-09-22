// app/api/products/route.ts
import { NextResponse } from "next/server"
import products from "../../../data/products.json" assert { type: "json" }
import type { Product } from "../../../lib/types"

export const dynamic = "force-dynamic"

// Versuche, aus vorhandenen Feldern/Bezeichnungen ein Gewicht abzuleiten.
// Wenn dein JSON bereits `weightGrams` enthält, wird es unverändert übernommen.
function inferWeightGrams(p: any): number {
  // 1) Wenn im JSON vorhanden → nehmen
  if (typeof p.weightGrams === "number" && p.weightGrams > 0) return p.weightGrams
  if (typeof p.weight_grams === "number" && p.weight_grams > 0) return p.weight_grams

  // 2) Heuristik nach Titel/Typ/Slug
  const hay = `${p?.title ?? ""} ${p?.subtitle ?? ""} ${p?.type ?? ""} ${p?.slug ?? ""}`.toLowerCase()

  // Vinyl: Schallplatte ~250g + Versandkarton ~100g
  if (hay.includes("vinyl") || hay.includes("lp") || p?.type === "vinyl") return 350

  // Doppel-CD: ~60g + Verpackung ~40g
  if (hay.includes("doppel") && hay.includes("cd")) return 100
  if (hay.includes("2cd") || hay.includes("double cd") || p?.type === "2cd") return 100

  // CD (einfach): grober Default ~80–100g
  if (hay.includes("cd") || p?.type === "cd") return 90

  // Sonst ein konservativer Default
  return 200
}

export async function GET() {
  // Nur aktive Produkte
  const raw = (products as Product[]).filter((p: any) => p?.active)

  // Garantiert weightGrams hinzufügen
  const withWeights = raw.map((p: any) => ({
    ...p,
    weightGrams: inferWeightGrams(p),
  }))

  return NextResponse.json({ products: withWeights })
}