// app/api/shipping/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../lib/db"
import {
  resolveZone,
  labelForBracket,
  priceFor,
  type RegionCode,
} from "../../../lib/shipping"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type CartItem = { id: string; qty: number }
type ReqBody = {
  items: CartItem[]
  countryIso2?: string | null
  carrier?: "POST" | "DPD" | "GLS" | null
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ReqBody
    const items = Array.isArray(body?.items) ? body.items : []
    if (items.length === 0) {
      return NextResponse.json({ error: "No items" }, { status: 400 })
    }

    // Produkte laden
    const ids = items.map((i) => i.id)
    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, priceEUR: true, weightGrams: true },
    })

    // Map für schnellen Zugriff
    const map = new Map(products.map((p) => [p.id, p]))

    // Summen bilden
    let subtotalEUR = 0
    let totalGrams = 0
    for (const it of items) {
      const p = map.get(it.id)
      const qty = Math.max(1, Number(it.qty || 1))
      if (!p) continue
      subtotalEUR += (Number(p.priceEUR) || 0) * qty
      totalGrams += (Number(p.weightGrams) || 0) * qty
    }

    // Zone bestimmen
    const zone: RegionCode = resolveZone(body.countryIso2 || undefined)

    // Freigrenze (falls gesetzt)
    const freeMinRaw = process.env.SHOP_FREE_SHIPPING_MIN
    const freeMin = freeMinRaw ? Number(freeMinRaw) : NaN
    const freeApplied =
      Number.isFinite(freeMin) && freeMin > 0 && subtotalEUR >= freeMin

    // Versandpreis
    const carrier = body.carrier ?? null
    const shippingEUR = freeApplied
      ? 0
      : carrier
      ? priceFor(carrier, zone, totalGrams) // carrier-spezifisch (3-Arg)
      : priceFor(totalGrams, zone) // POST-Referenz (2-Arg)

    const bracketLabel = labelForBracket(totalGrams)

    return NextResponse.json({
      ok: true,
      zone,
      subtotalEUR,
      totalWeightGrams: totalGrams,
      shippingEUR,
      bracket: bracketLabel,
      freeByThreshold: !!freeApplied,
      carrier: carrier ?? "AUTO",
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 }
    )
  }
}