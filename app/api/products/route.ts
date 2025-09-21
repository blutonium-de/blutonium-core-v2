// app/api/products/route.ts
import { NextResponse } from "next/server"
import products from "../../../data/products.json" assert { type: "json" }
import type { Product } from "../../../lib/types"

export const dynamic = "force-dynamic"

export async function GET() {
  // Nur aktive Produkte zurückgeben
  const list = (products as Product[]).filter(p => p.active)
  return NextResponse.json({ products: list })
}