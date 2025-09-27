// app/de/merch/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

export const dynamic = "force-dynamic";

type CartItem = { id: string; qty: number };
type Cart = Record<string, CartItem>;

type Product = {
  id: string;
  slug: string;
  productName?: string | null;
  artist?: string | null;
  trackTitle?: string | null;
  subtitle?: string | null;
  image?: string | null;
  priceEUR?: number | null;
  currency?: string | null;
  categoryCode?: string | null;
  year?: number | null;
  weightGrams?: number | null;
};

type RegionCode = "AT" | "EU" | "WORLD";

// --- gleiche Logik wie Server (leichtgewichtige Kopie)
function getFreeMin(): number {
  const raw = process.env.NEXT_PUBLIC_FREE_SHIP_MIN || process.env.SHOP_FREE_SHIPPING_MIN;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : 0;
}
function estimateShipping(region: RegionCode, weight: number, subtotal: number): { label: string; amount: number; free: boolean } {
  const freeMin = getFreeMin();
  const free = freeMin > 0 && subtotal >= freeMin;

  // einfache Spiegellogik zu lib/shipping.ts (nur günstigste Option)
  const T: Record<RegionCode, Array<{ max: number; post: number; dpd?: number; gls?: number }>> = {
    AT: [
      { max: 500, post: 4.5 },
      { max: 2000, post: 6.9, dpd: 6.5, gls: 6.9 },
      { max: 5000, post: 8.9, dpd: 8.5, gls: 8.9 },
      { max: 10000, post: 11.9, dpd: 10.9, gls: 11.9 },
    ],
    EU: [
      { max: 500, post: 9.9 },
      { max: 2000, post: 14.9, dpd: 12.9, gls: 13.9 },
      { max: 5000, post: 19.9, dpd: 17.9, gls: 18.9 },
      { max: 10000, post: 29.9, dpd: 24.9, gls: 26.9 },
    ],
    WORLD: [
      { max: 500, post: 14.9 },
      { max: 2000, post: 24.9 },
      { max: 5000, post: 39.9 },
      { max: 10000, post: 59.9 },
    ],
  };

  const row = (T[region] || []).find(r => r.max >= Math.max(1, weight));
  if (!row) return { label: "Versand wird nachträglich berechnet", amount: 0, free: false };

  const prices = [row.post, row.dpd, row.gls].filter((v) => typeof v === "number") as number[];
  const cheapest = prices.length ? Math.min(...prices) : row.post;
  return { label: free ? "Versand – frei" : "Versand", amount: free ? 0 : cheapest, free };
}

function formatEUR(n: number | null | undefined) {
  if (n == null) return "—";
  return `${n.toFixed(2)} €`;
}

export default function MerchPage() {
  const [cart, setCart] = useState<Cart>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<RegionCode>("AT");

  // 1) Cart aus LocalStorage laden (clientseitig)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cart");
      const parsed = raw ? (JSON.parse(raw) as Cart) : {};
      setCart(parsed);
    } catch (e) {
      console.error("Fehler beim Lesen des Carts:", e);
      setCart({});
    }
  }, []);

  // 2) Produktliste laden und auf Cart-IDs filtern
  useEffect(() => {
    let done = false;
    async function load() {
      try {
        setLoading(true);
        const r = await fetch("/api/products", { cache: "no-store" });
        const j = await r.json();
        const all: Product[] = Array.isArray(j?.products) ? j.products : [];
        const ids = new Set(Object.keys(cart));
        const filtered = all.filter((p) => ids.has(p.id));
        if (!done) setProducts(filtered);
      } catch (e) {
        console.error("Produkte laden fehlgeschlagen:", e);
        if (!done) setProducts([]);
      } finally {
        if (!done) setLoading(false);
      }
    }
    load();
    return () => { done = true; };
  }, [cart]);

  // Summen
  const subtotal = useMemo(() => {
    return products.reduce((sum, p) => {
      const qty = cart[p.id]?.qty || 0;
      const price = typeof p.priceEUR === "number" ? p.priceEUR : 0;
      return sum + price * qty;
    }, 0);
  }, [products, cart]);

  const totalWeight = useMemo(() => {
    return products.reduce((sum, p) => {
      const qty = cart[p.id]?.qty || 0;
      const w = typeof p.weightGrams === "number" ? p.weightGrams : 0;
      return sum + Math.max(0, w) * qty;
    }, 0);
  }, [products, cart]);

  const shippingPreview = useMemo(() => estimateShipping(region, totalWeight, subtotal), [region, totalWeight, subtotal]);

  function setQty(id: string, qty: number) {
    setCart((prev) => {
      const next: Cart = { ...prev };
      if (qty <= 0) {
        delete next[id];
      } else {
        next[id] = { id, qty };
      }
      localStorage.setItem("cart", JSON.stringify(next));
      return next;
    });
  }

  function clearCart() {
    const empty: Cart = {};
    localStorage.setItem("cart", JSON.stringify(empty));
    setCart(empty);
  }

  async function goCheckout() {
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ items: cart, region }),
      });
      const j = await r.json();
      if (j?.url) {
        window.location.assign(j.url);
      } else {
        alert("Checkout fehlgeschlagen: " + (j?.error || "Unbekannter Fehler"));
      }
    } catch (e: any) {
      alert("Checkout Fehler: " + (e?.message || e));
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl sm:text-4xl font-extrabold">Warenkorb</h1>

      {/* Region-Auswahl */}
      <div className="mt-3 flex items-center gap-3">
        <div className="text-sm opacity-70">Lieferregion:</div>
        <select
          className="bg-white/10 border border-white/10 rounded px-2 py-1"
          value={region}
          onChange={(e) => setRegion(e.target.value as RegionCode)}
        >
          <option value="AT">Österreich</option>
          <option value="EU">EU (ohne AT)</option>
          <option value="WORLD">Weltweit</option>
        </select>
      </div>

      {loading && <div className="mt-6 text-white/70">Lade …</div>}

      {!loading && products.length === 0 && (
        <div className="mt-6 text-white/70">Dein Warenkorb ist leer.</div>
      )}

      {!loading && products.length > 0 && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Liste */}
          <div className="lg:col-span-2 space-y-4">
            {products.map((p) => {
              const qty = cart[p.id]?.qty || 0;
              const title =
                p.productName ??
                `${p.artist ?? ""}${p.artist && p.trackTitle ? " – " : ""}${p.trackTitle ?? ""}` ||
                p.slug;

              return (
                <div key={p.id} className="flex gap-4 p-3 rounded border border-white/10 bg-white/5">
                  <div className="w-24 h-24 bg-white/10 shrink-0">
                    <img
                      src={p.image || "/shop/placeholder-500.jpg"}
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{title}</div>
                    {p.subtitle && <div className="text-sm text-white/60">{p.subtitle}</div>}
                    <div className="text-sm text-white/60 mt-1">
                      {String(p.categoryCode || "").toUpperCase()} {p.year ? `· ${p.year}` : ""}
                    </div>

                    <div className="mt-2 flex items-center gap-3">
                      <div className="font-bold">{formatEUR(p.priceEUR ?? 0)}</div>
                      <div className="flex items-center gap-2">
                        <button
                          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                          onClick={() => setQty(p.id, Math.max(0, qty - 1))}
                        >
                          −
                        </button>
                        <div className="min-w-8 text-center">{qty}</div>
                        <button
                          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                          onClick={() => setQty(p.id, qty + 1)}
                        >
                          +
                        </button>
                        <button
                          className="ml-2 px-2 py-1 rounded bg-red-500/80 hover:bg-red-500 text-black font-semibold"
                          onClick={() => setQty(p.id, 0)}
                        >
                          Entfernen
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Zusammenfassung */}
          <aside className="lg:col-span-1 p-4 rounded border border-white/10 bg-white/5">
            <div className="flex items-center justify-between">
              <div>Zwischensumme</div>
              <div className="font-bold">{formatEUR(subtotal)}</div>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div>{shippingPreview.label}</div>
              <div className="font-bold">{formatEUR(shippingPreview.amount)}</div>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div>Gesamt</div>
              <div className="font-extrabold">
                {formatEUR(subtotal + shippingPreview.amount)}
              </div>
            </div>

            <div className="text-sm text-white/60 mt-1">
              Versand & Steuern final im Checkout. Freigrenze:{" "}
              {getFreeMin() > 0 ? `${getFreeMin().toFixed(2)} €` : "keine"}
            </div>

            <button
              className="mt-4 w-full px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
              onClick={goCheckout}
            >
              Zur Kasse
            </button>

            <button
              className="mt-2 w-full px-4 py-2 rounded bg-white/10 hover:bg-white/20"
              onClick={clearCart}
            >
              Warenkorb leeren
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}