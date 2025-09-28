// app/de/cart/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
  stock?: number | null; // << NEU: Lagerbestand, optional (fällt zurück auf "unbegrenzt", wenn nicht gesetzt)
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
  // Badge updaten
  window.dispatchEvent(new CustomEvent("cart:changed"));
}

export default function CartPage() {
  const [cart, setCart] = useState<CartMap>({});
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper: max erlaubte Menge für ein Produkt
  function maxFor(p: Product): number {
    return typeof p.stock === "number" && Number.isFinite(p.stock) && p.stock > 0
      ? p.stock
      : Number.POSITIVE_INFINITY; // wenn kein Stock mitkommt, nicht begrenzen
  }

  // initial cart laden
  useEffect(() => {
    const c = readCart();
    setCart(c);

    const ids = Object.keys(c);
    if (ids.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const url = `/api/public/products?ids=${encodeURIComponent(ids.join(","))}`;
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const list: Product[] = Array.isArray(j?.items) ? j.items : [];
        // Falls sich der Lagerbestand verkleinert hat, Mengen im Cart nach unten korrigieren
        if (list.length) {
          const nextCart = { ...c };
          let changed = false;
          for (const p of list) {
            const entry = nextCart[p.id];
            if (!entry) continue;
            const max = maxFor(p);
            if (Number.isFinite(max) && entry.qty > max) {
              nextCart[p.id] = { ...entry, qty: Math.max(1, Number(max)) };
              changed = true;
            }
            // Falls Produkt inaktiv oder Stock 0 -> aus Warenkorb entfernen
            if (!p.active || (typeof p.stock === "number" && p.stock <= 0)) {
              delete nextCart[p.id];
              changed = true;
            }
          }
          if (changed) {
            setCart(nextCart);
            writeCart(nextCart);
          }
        }
        setItems(list);
      })
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
      return { product: p, qty, unitPrice, lineTotal };
    });
  }, [items, cart]);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.lineTotal, 0),
    [lines]
  );

  function setQtyClamped(p: Product, qty: number) {
    // auf [1, max] clampen (oder löschen, wenn <= 0)
    const max = maxFor(p);
    const clamped = qty <= 0 ? 0 : Math.min(qty, Number.isFinite(max) ? max : qty);
    const next = { ...cart };
    if (clamped <= 0) delete next[p.id];
    else next[p.id] = { ...(next[p.id] || {}), qty: clamped };
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
        <div className="mt-6">
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
      <h1 className="text-3xl font-bold mb-6">Warenkorb</h1>

      <div className="space-y-4">
        {lines.map(({ product: p, qty, unitPrice, lineTotal }) => {
          const max = maxFor(p);
          const atMax = Number.isFinite(max) && qty >= max;

          return (
            <div
              key={p.id}
              className="flex gap-4 items-center rounded-2xl bg-white/5 border border-white/10 p-3"
            >
              {/* Bild */}
              <div className="w-[90px] h-[90px] rounded overflow-hidden bg-black/30 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image || "/placeholder.png"}
                  alt={p.productName || p.slug}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Infos */}
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">
                  {p.productName && p.productName.trim().length > 0
                    ? p.productName
                    : `${p.artist ?? ""}${p.artist && p.trackTitle ? " – " : ""}${
                        p.trackTitle ?? p.slug
                      }`}
                </div>
                <div className="text-sm opacity-75">
                  {unitPrice.toFixed(2)} € / Stück
                </div>
                {Number.isFinite(max) && (
                  <div className="mt-1 text-xs opacity-70">
                    Nur {max} verfügbar
                  </div>
                )}
              </div>

              {/* Menge */}
              <div className="flex items-center gap-2">
                <button
                  className="w-8 h-8 rounded bg-white/10 hover:bg-white/20"
                  onClick={() => setQtyClamped(p, qty - 1)}
                  aria-label="Menge verringern"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  {...(Number.isFinite(max) ? { max } : {})}
                  value={qty}
                  onChange={(e) => {
                    const n = Math.max(1, Number(e.target.value) || 1);
                    setQtyClamped(p, Number.isFinite(max) ? Math.min(n, max) : n);
                  }}
                  className="w-16 text-center rounded bg-white/10 px-2 py-1"
                />
                <button
                  className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 disabled:opacity-50"
                  onClick={() => setQtyClamped(p, qty + 1)}
                  aria-label="Menge erhöhen"
                  disabled={atMax}
                  title={atMax ? "Maximale Stückzahl erreicht" : "Menge erhöhen"}
                >
                  +
                </button>
              </div>

              {/* Zwischensumme Zeile */}
              <div className="w-[110px] text-right font-semibold">
                {lineTotal.toFixed(2)} €
              </div>

              {/* Entfernen */}
              <button
                onClick={() => remove(p.id)}
                className="ml-2 rounded bg-red-500/20 hover:bg-red-500/30 px-3 py-2 text-red-200"
                aria-label="Artikel entfernen"
              >
                Entfernen
              </button>
            </div>
          );
        })}
      </div>

      {/* Summen */}
      <div className="mt-6 flex items-center justify-end gap-6">
        <div className="text-right">
          <div className="opacity-70 text-sm">Zwischensumme</div>
          <div className="text-2xl font-extrabold">{subtotal.toFixed(2)} €</div>
          <div className="opacity-60 text-xs">Versand wird im Checkout berechnet.</div>
        </div>
        <Link
          href="/de/checkout"
          className="inline-flex items-center rounded bg-cyan-500 text-black px-5 py-3 font-semibold hover:bg-cyan-400"
        >
          Zur Kasse
        </Link>
      </div>
    </div>
  );
}