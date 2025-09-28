// app/en/cart/page.tsx
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
  stock?: number | null; // we read this from /api/public/products
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
  // update badge
  window.dispatchEvent(new CustomEvent("cart:changed"));
}

export default function CartPage() {
  const [cart, setCart] = useState<CartMap>({});
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // initial load
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
      .then((j) => setItems(Array.isArray(j?.items) ? j.items : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const lines = useMemo(() => {
    return items.map((p) => {
      const cartQty = Math.max(0, Number(cart[p.id]?.qty || 0));
      const max = Math.max(0, Number(p.stock ?? 0)); // clamp to stock
      const qty = max > 0 ? Math.min(cartQty, max) : 0;

      const unitPrice = Number.isFinite(cart[p.id]?.price!)
        ? Number(cart[p.id]?.price)
        : p.priceEUR;

      const lineTotal = qty * unitPrice;
      return { product: p, qty, unitPrice, lineTotal, max };
    });
  }, [items, cart]);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.lineTotal, 0),
    [lines]
  );

  function setQty(id: string, qty: number) {
    // find product max
    const prod = items.find((x) => x.id === id);
    const max = Math.max(0, Number(prod?.stock ?? 0));
    const clamped = Math.max(1, Math.min(qty || 1, max || 1)); // if max==0, we’ll end up removing below

    const next = { ...cart };
    if (max <= 0 || clamped <= 0) {
      delete next[id];
    } else {
      next[id] = { ...(next[id] || {}), qty: clamped };
    }
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
        <h1 className="text-3xl font-bold mb-6">Cart</h1>
        <p className="opacity-70">Loading …</p>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">Cart</h1>
        <p className="opacity-70">Your cart is empty.</p>
        <div className="mt-6">
          <Link
            href="/en/shop"
            className="inline-flex items-center rounded bg-cyan-500 text-black px-4 py-2 font-semibold hover:bg-cyan-400"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Cart</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/en/shop"
            className="rounded bg-white/10 hover:bg-white/20 px-3 py-2 text-sm"
          >
            Continue shopping
          </Link>
          <Link
            href="/en/checkout"
            className="inline-flex items-center rounded bg-cyan-500 text-black px-4 py-2 font-semibold hover:bg-cyan-400"
          >
            Checkout
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {lines.map(({ product: p, qty, unitPrice, lineTotal, max }) => (
          <div
            key={p.id}
            className="flex gap-4 items-center rounded-2xl bg-white/5 border border-white/10 p-3"
          >
            {/* Image */}
            <div className="w-[90px] h-[90px] rounded overflow-hidden bg-black/30 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image || "/placeholder.png"}
                alt={p.productName || p.slug}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">
                {p.productName && p.productName.trim().length > 0
                  ? p.productName
                  : `${p.artist ?? ""}${p.artist && p.trackTitle ? " – " : ""}${
                      p.trackTitle ?? p.slug
                    }`}
              </div>
              <div className="text-sm opacity-75">
                {unitPrice.toFixed(2)} € / item
              </div>
              {typeof p.stock === "number" && (
                <div className="text-xs opacity-70 mt-0.5">
                  In stock: {Math.max(0, p.stock)}
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-2">
              <button
                className="w-8 h-8 rounded bg-white/10 hover:bg-white/20"
                onClick={() => setQty(p.id, qty - 1)}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={Math.max(1, max || 1)}
                value={qty}
                onChange={(e) =>
                  setQty(
                    p.id,
                    Math.max(1, Math.min(Number(e.target.value) || 1, Math.max(1, max || 1)))
                  )
                }
                className="w-16 text-center rounded bg-white/10 px-2 py-1"
              />
              <button
                className="w-8 h-8 rounded bg-white/10 hover:bg-white/20"
                onClick={() => setQty(p.id, qty + 1)}
                aria-label="Increase quantity"
                disabled={qty >= Math.max(0, max)}
                title={qty >= Math.max(0, max) ? "Reached stock limit" : "Increase quantity"}
              >
                +
              </button>
            </div>

            {/* Line total */}
            <div className="w-[110px] text-right font-semibold">
              {lineTotal.toFixed(2)} €
            </div>

            {/* Remove */}
            <button
              onClick={() => remove(p.id)}
              className="ml-2 rounded bg-red-500/20 hover:bg-red-500/30 px-3 py-2 text-red-200"
              aria-label="Remove item"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="mt-6 flex items-center justify-end gap-6">
        <div className="text-right">
          <div className="opacity-70 text-sm">Subtotal</div>
          <div className="text-2xl font-extrabold">{subtotal.toFixed(2)} €</div>
          <div className="opacity-60 text-xs">
            Shipping is calculated at checkout.
          </div>
        </div>
        <Link
          href="/en/checkout"
          className="inline-flex items-center rounded bg-cyan-500 text-black px-5 py-3 font-semibold hover:bg-cyan-400"
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}