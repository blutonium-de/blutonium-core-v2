"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "../../../lib/types";

type CartItem = { id: string; qty: number };
type Cart = Record<string, CartItem>;

function formatEUR(n: number) {
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(n);
  } catch {
    return `${n.toFixed(2)} €`;
  }
}

export default function MerchPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [checkingOut, setCheckingOut] = useState(false);

  // Laden
  useEffect(() => {
    const base = typeof window === "undefined" ? "" : window.location.origin;
    fetch(`${base}/api/products`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        const j = await r.json();
        setProducts(j.products || []);
      })
      .catch((e) => setError(e.message || "Fehler beim Laden"));
  }, []);

  // Cart aus LocalStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cart");
      if (raw) setCart(JSON.parse(raw));
    } catch {}
  }, []);

  // Cart speichern
  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(cart));
    } catch {}
  }, [cart]);

  function addToCart(id: string, qty = 1) {
    setCart((prev) => {
      const cur = prev[id]?.qty || 0;
      return { ...prev, [id]: { id, qty: Math.max(1, cur + qty) } };
    });
  }
  function setQty(id: string, qty: number) {
    setCart((prev) => ({
      ...prev,
      [id]: { id, qty: Math.max(1, Math.floor(qty || 1)) },
    }));
  }
  function removeFromCart(id: string) {
    setCart((prev) => {
      const cp = { ...prev };
      delete cp[id];
      return cp;
    });
  }
  function clearCart() {
    setCart({});
  }

  const cartList = useMemo(() => Object.values(cart), [cart]);
  const productMap = useMemo(
    () => new Map((products || []).map((p) => [p.id, p] as const)),
    [products]
  );
  const totalEUR = useMemo(() => {
    return cartList.reduce((sum, item) => {
      const p = productMap.get(item.id);
      if (!p) return sum;
      return sum + p.priceEUR * item.qty;
    }, 0);
  }, [cartList, productMap]);

  async function goCheckout() {
    try {
      setCheckingOut(true);
      const items = cartList.map((c) => ({ id: c.id, qty: c.qty }));
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Checkout fehlgeschlagen");
      if (j?.url) {
        window.location.href = j.url; // Weiter zu Stripe
      } else {
        throw new Error("Keine Checkout-URL");
      }
    } catch (e: any) {
      alert(e?.message || "Checkout fehlgeschlagen");
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
          Merchandise &amp; Classics
        </h1>
        <p className="mt-3 text-white/70">
          Hoodie, Shirts & CDs. Der Checkout ist mit Stripe angebunden.
        </p>
      </header>

      {/* Grid + Cart */}
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
              {products.map((p) => (
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
                  {p.subtitle && (
                    <p className="text-white/70 text-sm">{p.subtitle}</p>
                  )}
                  <div className="mt-2 font-semibold">
                    {formatEUR(p.priceEUR)}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="btn" onClick={() => addToCart(p.id, 1)}>
                      In den Warenkorb
                    </button>
                    <a href={`/de/merch/${p.slug}`} className="btn">
                      Details
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Warenkorb */}
        <aside className="card h-fit sticky top-24">
          <h3 className="text-xl font-bold">Warenkorb</h3>
          {cartList.length === 0 && (
            <p className="mt-2 text-white/60 text-sm">Noch leer.</p>
          )}
          {cartList.length > 0 && (
            <div className="mt-3 space-y-3">
              {cartList.map((item) => {
                const p = productMap.get(item.id);
                if (!p) return null;
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <img
                      src={p.image}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{p.title}</div>
                      <div className="text-white/60 text-sm">
                        {formatEUR(p.priceEUR)}
                      </div>
                    </div>
                    <input
                      type="number"
                      min={1}
                      className="w-16 rounded bg-black/30 border border-white/10 px-2 py-1"
                      value={item.qty}
                      onChange={(e) => setQty(item.id, Number(e.target.value))}
                    />
                    <button className="btn" onClick={() => removeFromCart(item.id)}>
                      ×
                    </button>
                  </div>
                );
              })}
              <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between">
                <div className="font-semibold">Summe</div>
                <div className="font-bold">{formatEUR(totalEUR)}</div>
              </div>
              <div className="flex gap-2">
                <button className="btn flex-1" onClick={clearCart}>
                  Leeren
                </button>
                <button
                  className="btn flex-1"
                  onClick={goCheckout}
                  disabled={checkingOut}
                >
                  {checkingOut ? "Weiterleiten …" : "Zur Kasse"}
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}