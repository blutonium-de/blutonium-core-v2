"use client"

import { useEffect, useMemo, useState } from "react"
import type { Product } from "../../../lib/types"
import {
  CARRIERS,
  type Carrier,
  computeShipping,
  computeMerchSubtotalCents,
  resolveZone,
  type CartItem,
} from "../../../lib/shipping"

type Cart = Record<string, CartItem>

function formatEUR(n: number) {
  try { return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n) }
  catch { return `${n.toFixed(2)} €` }
}

const FREE_SHIPPING_MIN_EUR = 100
const DEFAULT_COUNTRY = "AT" as const
const DEFAULT_CARRIER: Carrier = "POST_DHL"

export default function MerchPage() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cart, setCart] = useState<Cart>({})

  const [country, setCountry] = useState<string>(DEFAULT_COUNTRY)
  const [carrier, setCarrier] = useState<Carrier>(DEFAULT_CARRIER)
  const [busy, setBusy] = useState(false)

  // Laden
  useEffect(() => {
    const base = typeof window === "undefined" ? "" : window.location.origin
    fetch(`${base}/api/products`, { cache: "no-store" })
      .then(async r => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        const j = await r.json()
        setProducts(j.products || [])
      })
      .catch(e => setError(e.message || "Fehler beim Laden"))
  }, [])

  // Cart aus LocalStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cart")
      if (raw) setCart(JSON.parse(raw))
    } catch {}
  }, [])

  // Cart speichern
  useEffect(() => {
    try { localStorage.setItem("cart", JSON.stringify(cart)) } catch {}
  }, [cart])

  function addToCart(id: string, qty = 1) {
    setCart(prev => {
      const cur = prev[id]?.qty || 0
      return { ...prev, [id]: { id, qty: Math.max(1, cur + qty) } }
    })
  }
  function setQty(id: string, qty: number) {
    setCart(prev => ({ ...prev, [id]: { id, qty: Math.max(1, Math.floor(qty || 1)) } }))
  }
  function removeFromCart(id: string) {
    setCart(prev => {
      const cp = { ...prev }
      delete cp[id]
      return cp
    })
  }
  function clearCart() { setCart({}) }

  const cartList = useMemo(() => Object.values(cart), [cart])
  const productMap = useMemo(
    () => new Map((products || []).map(p => [p.id, p] as const)),
    [products]
  )

  const subtotalEUR = useMemo(() => {
    const cents = computeMerchSubtotalCents(cartList, productMap)
    return cents / 100
  }, [cartList, productMap])

  const ship = useMemo(() => {
    return computeShipping({
      items: cartList,
      products: productMap,
      destinationCountry: country,
      carrier,
      freeShippingMinEUR: FREE_SHIPPING_MIN_EUR,
    })
  }, [cartList, productMap, country, carrier])

  const shippingEUR = ship.shippingCents / 100
  const totalEUR = subtotalEUR + shippingEUR
  const missingForFree = Math.max(0, (ship.thresholdCents / 100) - subtotalEUR)

  async function goCheckout() {
    try {
      setBusy(true)
      const base = typeof window === "undefined" ? "" : window.location.origin
      const res = await fetch(`${base}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartList,
          country,
          carrier,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || `Checkout failed (${res.status})`)
      if (j?.url) window.location.href = j.url
    } catch (e: any) {
      alert(e?.message || "Konnte Checkout nicht starten.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
          Merchandise &amp; Classics
        </h1>
        <p className="mt-3 text-white/70">
          Hoodie, Shirts & CDs. Versandkosten werden live berechnet (inkl. versandfrei ab {formatEUR(FREE_SHIPPING_MIN_EUR)}).
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Produkte */}
        <section className="lg:col-span-2">
          {!products && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="w-full aspect-square rounded-xl bg-white/10" />
                  <div className="h-4 w-2/3 mt-4 bg-white/10 rounded" />
                  <div className="h-3 w-1/3 mt-2 bg-white/10 rounded" />
                </div>
              ))}
            </div>
          )}
          {error && <div className="text-red-300">Fehler: {error}</div>}
          {products && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.map(p => (
                <article key={p.id} className="card">
                  <div className="aspect-square w-full overflow-hidden rounded-xl bg-white/10">
                    <img
                      src={p.image}
                      alt={p.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <h2 className="mt-3 text-lg font-semibold">{p.title}</h2>
                  {p.subtitle && <p className="text-white/70 text-sm">{p.subtitle}</p>}
                  <div className="mt-2 font-semibold">{formatEUR(p.priceEUR)}</div>

                  {p.isDigital && (
                    <div className="mt-1 text-xs text-white/60">Digitales Produkt – kein Versand nötig</div>
                  )}
                  {!p.isDigital && (p.weightGrams ?? 0) === 0 && (
                    <div className="mt-1 text-xs text-white/60">🚚 Versandkostenfrei</div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button className="btn" onClick={() => addToCart(p.id, 1)}>In den Warenkorb</button>
                    <a href={`/de/merch/${p.slug}`} className="btn">Details</a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Warenkorb + Versand-Vorschau */}
        <aside className="card h-fit sticky top-24">
          <h3 className="text-xl font-bold">Warenkorb</h3>

          {/* Versand-Block */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-white/60">Lieferland</label>
              <select
                className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="AT">Österreich</option>
                <option value="DE">Deutschland</option>
                <option value="CH">Schweiz</option>
                <option disabled>──────────</option>
                <option value="BE">Belgien</option>
                <option value="NL">Niederlande</option>
                <option value="LU">Luxemburg</option>
                <option value="IT">Italien</option>
                <option value="FR">Frankreich</option>
                <option value="ES">Spanien</option>
                <option value="PT">Portugal</option>
                <option value="PL">Polen</option>
                <option value="CZ">Tschechien</option>
                <option value="SK">Slowakei</option>
                <option value="SI">Slowenien</option>
                <option value="HU">Ungarn</option>
                <option value="RO">Rumänien</option>
                <option value="BG">Bulgarien</option>
                <option value="GR">Griechenland</option>
                <option value="IE">Irland</option>
                <option value="DK">Dänemark</option>
                <option value="SE">Schweden</option>
                <option value="FI">Finnland</option>
                <option value="NO">Norwegen</option>
                <option disabled>──────────</option>
                <option value="US">USA</option>
                <option value="CA">Kanada</option>
                <option value="AU">Australien</option>
                <option value="NZ">Neuseeland</option>
                <option value="JP">Japan</option>
                <option value="BR">Brasilien</option>
                <option value="MX">Mexiko</option>
              </select>
              <div className="text-xs text-white/50 mt-1">
                Zone: {resolveZone(country)}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/60">Versanddienst</label>
              <select
                className="mt-1 w-full rounded bg-black/30 border border-white/10 px-2 py-1"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value as Carrier)}
              >
                {Object.entries(CARRIERS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {cartList.length === 0 && (
            <p className="mt-3 text-white/60 text-sm">Noch leer.</p>
          )}

          {cartList.length > 0 && (
            <>
              <div className="mt-3 space-y-3">
                {cartList.map(item => {
                  const p = productMap.get(item.id)
                  if (!p) return null
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <img src={p.image} alt="" className="w-14 h-14 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{p.title}</div>
                        <div className="text-white/60 text-sm">{formatEUR(p.priceEUR)}</div>
                      </div>
                      <input
                        type="number"
                        min={1}
                        className="w-16 rounded bg-black/30 border border-white/10 px-2 py-1"
                        value={item.qty}
                        onChange={e => setQty(item.id, Number(e.target.value))}
                      />
                      <button className="btn" onClick={() => removeFromCart(item.id)}>×</button>
                    </div>
                  )
                })}
              </div>

              <div className="pt-3 mt-4 border-t border-white/10 space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span>Zwischensumme</span>
                  <span className="font-semibold">{formatEUR(subtotalEUR)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Versand</span>
                  <span className="font-semibold">
                    {ship.freeApplied ? "0,00 € (versandfrei)" : formatEUR(shippingEUR)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-base font-bold pt-1 border-t border-white/10 mt-2">
                  <span>Gesamt</span>
                  <span>{formatEUR(totalEUR)}</span>
                </div>

                {!ship.freeApplied && ship.thresholdCents > 0 && missingForFree > 0 && (
                  <div className="mt-2 text-xs text-white/70">
                    Noch {formatEUR(missingForFree)} bis <b>versandkostenfrei ab {formatEUR(ship.thresholdCents/100)}</b>.
                  </div>
                )}
                {ship.freeApplied && (
                  <div className="mt-2 text-xs text-emerald-300">
                    ✅ Versandkostenfrei (ab {formatEUR(ship.thresholdCents/100)})
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                <button className="btn flex-1" onClick={clearCart}>Leeren</button>
                <button className="btn flex-1" onClick={goCheckout} disabled={busy}>
                  {busy ? "Weiter zur Kasse …" : "Zur Kasse"}
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}