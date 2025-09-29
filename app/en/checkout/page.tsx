// app/en/checkout/page.tsx
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
  stock: number | null;
  isDigital: boolean | null;
  active: boolean;
};

function readCart(): CartMap {
  try { return JSON.parse(localStorage.getItem("cart") || "{}"); } catch { return {}; }
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartMap>({});
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      const qty = Math.max(0, Number(cart[p.id]?.qty || 0));
      const unitPrice = Number.isFinite(cart[p.id]?.price!) ? Number(cart[p.id]?.price) : p.priceEUR;
      const max = Math.max(0, Number(p.stock ?? 0));
      const clampedQty = Math.min(qty, max);
      const lineTotal = clampedQty * unitPrice;
      const title =
        (p.productName && p.productName.trim().length > 0)
          ? p.productName
          : `${p.artist ?? ""}${p.artist && p.trackTitle ? " – " : ""}${p.trackTitle ?? p.slug}`;

      return { product: p, qty: clampedQty, unitPrice, lineTotal, title };
    }).filter(l => l.qty > 0 && l.product.active);
  }, [items, cart]);

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.lineTotal, 0), [lines]);

  async function goToStripe() {
    setErr(null);
    setCreating(true);
    try {
      const payload = { items: lines.map((l) => ({ id: l.product.id, qty: l.qty })), locale: "en" };
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // robuster Fehler-Output
      const txt = await r.text();
      let j: any; try { j = JSON.parse(txt); } catch { j = null; }
      if (!r.ok) throw new Error(j?.error || txt || "Could not start checkout.");

      const url = j?.url as string | undefined;
      if (!url) throw new Error("No checkout URL returned.");
      window.location.href = url;
    } catch (e: any) {
      setErr(e?.message || "Error starting checkout");
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">Checkout</h1>
        <p className="opacity-70">Loading …</p>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">Checkout</h1>
        <p className="opacity-70">Your cart is empty.</p>
        <div className="mt-6">
          <Link href="/en/shop" className="inline-flex items-center rounded bg-cyan-500 text-black px-4 py-2 font-semibold hover:bg-cyan-400">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      <div className="space-y-3">
        {lines.map((l) => (
          <div key={l.product.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
            <div className="min-w-0">
              <div className="font-semibold truncate">{l.title}</div>
              <div className="text-xs opacity-70">{l.qty} × {l.unitPrice.toFixed(2)} €</div>
            </div>
            <div className="shrink-0 font-semibold">{l.lineTotal.toFixed(2)} €</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Link href="/en/cart" className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">Back to cart</Link>
        <div className="text-right">
          <div className="opacity-70 text-sm">Subtotal</div>
          <div className="text-2xl font-extrabold">{subtotal.toFixed(2)} €</div>
          <div className="opacity-60 text-xs">Shipping (if needed) in Stripe checkout.</div>
          {err && <div className="mt-2 text-red-400 text-sm">{err}</div>}
          <button
            onClick={goToStripe}
            disabled={creating}
            className="mt-3 inline-flex items-center rounded bg-cyan-500 text-black px-5 py-3 font-semibold hover:bg-cyan-400 disabled:opacity-60"
          >
            {creating ? "Redirecting to Stripe …" : "Pay now"}
          </button>
        </div>
      </div>
    </div>
  );
}