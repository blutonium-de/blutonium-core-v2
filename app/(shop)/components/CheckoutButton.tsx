"use client"

import { useState } from "react"

type CartItem = { id: string; qty: number }
type Props = {
  items: CartItem[]
  defaultShipTo?: string // z.B. "AT"
}

export default function CheckoutButton({ items, defaultShipTo = "AT" }: Props) {
  const [shipTo, setShipTo] = useState(defaultShipTo)
  const [loading, setLoading] = useState(false)
  const disabled = loading || !items?.length

  async function go() {
    try {
      setLoading(true)
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items, shipTo }),
      })
      const j = await res.json()
      if (j?.url) window.location.href = j.url
      else alert(j?.error || "Checkout fehlgeschlagen")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm">Lieferland</label>
      <select
        className="border rounded px-2 py-1"
        value={shipTo}
        onChange={(e) => setShipTo(e.target.value)}
      >
        <option value="AT">Österreich</option>
        <option value="DE">Deutschland</option>
        <option value="BE">Belgien</option>
        <option value="NL">Niederlande</option>
        <option value="LU">Luxemburg</option>
        <option value="CH">Schweiz</option>
        <option value="IT">Italien</option>
        <option value="FR">Frankreich</option>
        <option value="ES">Spanien</option>
        <option value="PT">Portugal</option>
        <option value="GB">Vereinigtes Königreich</option>
        <option value="US">USA</option>
        <option value="CA">Kanada</option>
        <option value="AU">Australien</option>
        <option value="NZ">Neuseeland</option>
      </select>

      <button
        disabled={disabled}
        onClick={go}
        className="px-4 py-2 rounded bg-white/10 border border-white/20 disabled:opacity-50"
      >
        {loading ? "Weiter…" : "Zur Kasse"}
      </button>
    </div>
  )
}