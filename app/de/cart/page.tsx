// app/de/cart/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  sumWeight,
  chooseBestShipping,
  resolveZone,
  type RegionCode,
  labelForBracket,
} from "../../../lib/shipping";

type CartEntry = { qty: number; price?: number };
type CartMap = Record<string, CartEntry>;

type Product = {
  id: string;
  slug: string;
  productName: string | null;
  artist: string | null;
  trackTitle: string | null;
  priceEUR: number;
  image: string;
  weightGrams: number | null;
  isDigital: boolean | null;
  active: boolean;
  stock?: number | null;
};

function readCart(): CartMap {
  try {
    const raw = localStorage.getItem("cart");
    return raw ? (JSON.parse(raw) as CartMap) : {};
  } catch {
    return {};
  }
}
function writeCart(next: CartMap) {
  localStorage.setItem("cart", JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("cart:changed"));
}
function readRegion(): RegionCode {
  try {
    const r = localStorage.getItem("ship_region") as RegionCode | null;
    if (r === "AT" || r === "EU" || r === "WORLD") return r;
  } catch {}
  // Fallback: AT; optional könntest du über GeoIP o.ä. auf EU/WORLD mappen
  return "AT";
}
function writeRegion(r: RegionCode) {
  try { localStorage.setItem("ship_region", r); } catch {}
}

export default function CartPage() {
  const [cart, setCart] = useState<CartMap>({});
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<RegionCode>("AT");

  // initial
  useEffect(() => {
    setRegion(readRegion());

    const c = readCart();
    setCart(c);

    const ids = Object.keys(c);
    if (ids.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    fetch(`/api/public/products?ids=${encodeURIComponent(ids.join(","))}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setItems(Array.isArray(j?.items) ? j.items : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const lines = useMemo(() => {
    return items.map((p) => {
      const qty = Math.max(0, Number(cart[p.id]?.qty || 0));
      const unitPrice = Number.isFinite(cart[p.id]?.price!)
        ? Number(cart[p.id]?.price)
        : p.priceEUR;
      const lineTotal = qty * unitPrice;
      const title =
        p.productName && p.productName.trim().length > 0
          ? p.productName
          : `${p.artist ?? ""}${p.artist && p.trackTitle ? " – " : ""}${p.trackTitle ?? p.slug}`;
      return { product: p, qty, unitPrice, lineTotal, title };
    }).filter((l) => l.qty > 0 && l.product.active);
  }, [items, cart]);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.lineTotal, 0),
    [lines]
  );

  const totalWeight = useMemo(
    () =>
      sumWeight(
        lines.map((l) => ({
          weightGrams: l.product.weightGrams ?? 0,
          qty: l.qty,
        }))
      ),
    [lines]
  );

  const shipping = useMemo(() => {
    if (lines.length === 0) return null;
    return chooseBestShipping({
      region,
      totalWeightGrams: totalWeight,
      subtotalEUR: subtotal,
    });
  }, [region, totalWeight, subtotal, lines.length]);

  function setQty(id: string, qty: number) {
    const next = { ...cart };
    if (qty <= 0) delete next[id];
    else next[id] = { ...(next[id] || {}), qty };
    setCart(next);
    writeCart(next);
  }
  function remove(id: string) {
    const next = { ...cart };
    delete next[id];
    setCart(next);
    writeCart(next);
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">Warenkorb</h1>
        <p className="opacity-70">Lade …</p>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">Warenkorb</h1>
        <p className="opacity-70">Dein Warenkorb ist leer.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/de/shop"
            className="inline-flex items-center rounded bg-cyan-500 text-black px-4 py-2 font-semibold hover:bg-cyan-400"
          >
            Weiter shoppen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-3xl font-bold">Warenkorb</h1>

        {/* Aktionen (rechts) */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Region-Picker sichtbar im Warenkorb */}
          <label className="text-sm opacity-80 mr-1">Lieferregion:</label>
          <select
            value={region}
            onChange={(e) => {
              const r = e.target.value as RegionCode;
              setRegion(r);
              writeRegion(r);
            }}
            className="rounded bg-white/10 border border-white/15 px-2 py-1 text-sm"
            title="Lieferregion wählen"
          >
            <option value="AT">Österreich</option>
            <option value="EU">EU</option>
            <option value="WORLD">Weltweit</option>
          </select>

          <Link
            href="/de/shop"
            className="inline-flex items-center rounded border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm"
            title="Zurück zum Shop"
          >
            Weiter shoppen
          </Link>
          <Link
            href="/de/checkout"
            className="inline-flex items-center rounded bg-cyan-500 text-black px-4 py-2 text-sm font-semibold hover:bg-cyan-400"
            title="Zur Kasse"
          >
            Zur Kasse
          </Link>
        </div>
      </div>

      {/* Positionen */}
      <div className="mt-4 space-y-4">
        {lines.map(({ product: p, qty, unitPrice, lineTotal, title }) => (
          <div
            key={p.id}
            className="flex gap-4 items-center rounded-2xl bg-white/5 border border-white/10 p-3"
          >
            <div className="w-[90px] h-[90px] rounded overflow-hidden bg-black/30 shrink-0">
              <img src={p.image || "/placeholder.png"} alt={title} className="w-full h-full object-cover" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">{title}</div>
              <div className="text-sm opacity-75">{unitPrice.toFixed(2)} € / Stück</div>
            </div>

            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded bg-white/10 hover:bg-white/20" onClick={() => setQty(p.id, qty - 1)} aria-label="Menge verringern">−</button>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(p.id, Math.max(1, Number(e.target.value) || 1))}
                className="w-16 text-center rounded bg-white/10 px-2 py-1"
              />
              <button className="w-8 h-8 rounded bg-white/10 hover:bg-white/20" onClick={() => setQty(p.id, qty + 1)} aria-label="Menge erhöhen">+</button>
            </div>

            <div className="w-[110px] text-right font-semibold">{lineTotal.toFixed(2)} €</div>

            <button
              onClick={() => remove(p.id)}
              className="ml-2 rounded bg-red-500/20 hover:bg-red-500/30 px-3 py-2 text-red-200"
              aria-label="Artikel entfernen"
            >
              Entfernen
            </button>
          </div>
        ))}
      </div>

      {/* Summen & Versandübersicht */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 items-start">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-sm opacity-80">Gewicht</div>
          <div className="font-semibold">{(totalWeight / 1000).toFixed(2)} kg <span className="opacity-70 text-sm">({labelForBracket(totalWeight)})</span></div>

          {shipping && (
            <>
              <div className="mt-3 text-sm opacity-80">Versand ({region})</div>
              <div className="font-semibold">
                {shipping.amountEUR === 0 ? "Kostenlos" : `${shipping.amountEUR.toFixed(2)} €`}
                {shipping.freeByThreshold && <span className="ml-2 text-xs opacity-70">(Freigrenze erreicht)</span>}
              </div>
              <div className="mt-1 opacity-60 text-xs">{shipping.name}</div>
            </>
          )}
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="text-right">
            <div className="opacity-70 text-sm">Zwischensumme (ohne Versand)</div>
            <div className="text-2xl font-extrabold">{subtotal.toFixed(2)} €</div>
            <div className="opacity-60 text-xs">Genauer Versandpreis im nächsten Schritt (Stripe) – Region wird übernommen.</div>
          </div>
          <Link
            href="/de/checkout"
            className="inline-flex items-center rounded bg-cyan-500 text-black px-5 py-3 font-semibold hover:bg-cyan-400"
          >
            Zur Kasse
          </Link>
        </div>
      </div>
    </div>
  );
}