"use client"
import { useState } from "react"
import CheckoutButton from "@/app/(shop)/components/CheckoutButton"

export default function Page() {
  const [qtyVinyl, setQtyVinyl] = useState(1)
  const [qtyCD, setQtyCD] = useState(0)

  const items = [
    ...(qtyVinyl > 0 ? [{ id: "vinyl-abc", qty: qtyVinyl }] : []),
    ...(qtyCD > 0 ? [{ id: "2cd-xyz", qty: qtyCD }] : []),
  ]

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Checkout-Test</h1>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span>Vinyl ABC</span>
          <input type="number" min={0} value={qtyVinyl}
            className="w-20 border rounded px-2 py-1"
            onChange={e => setQtyVinyl(Number(e.target.value))} />
        </div>
        <div className="flex items-center gap-3">
          <span>Doppel-CD XYZ</span>
          <input type="number" min={0} value={qtyCD}
            className="w-20 border rounded px-2 py-1"
            onChange={e => setQtyCD(Number(e.target.value))} />
        </div>
      </div>

      <CheckoutButton items={items} defaultShipTo="AT" />
    </div>
  )
}