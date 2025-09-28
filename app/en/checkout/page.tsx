// app/en/checkout/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";

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
  stock?: number | null;
  active: boolean;
};

function readCart(): CartMap {
  try {
    const raw = localStorage.getItem("cart");
    return raw ? (JSON.parse(raw) as CartMap) : {};
  } catch {
    return {};
  }
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartMap>({});
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // load cart + fetch product details
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
      const unit =
        Number.isFinite(cart[p.id]?.price!) && Number(cart[p.id]?.price) > 0
          ? Number(cart[p.id]?.price)
          : p.priceEUR;
      const max = Math.max(0, Number(p.stock ?? 0));
      const clampedQty = Math.min(qty, max || qty); // if max==0 keep 0
      const total = clampedQty * unit;
      return { product: p, qty: clampedQty, unitPrice: unit, lineTotal: total, max };
    });
  }, [items, cart]);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.lineTotal, 0),
    [lines]
  );

  const disabled = useMemo(() => {
    if (lines.length === 0) return true;
    // disable if any clamped qty is 0 while user had >0 (out of stock)
    if (lines.some((l) => (cart[l.product.id]?.qty || 0) > l.max)) return true;
    return false;
  }, [lines, cart]);

  async function startCheckout() {
    setErr(null);
    setSubmitting(true);
    try {
      // payload for session creation
      const body = lines
        .filter((l) => l.qty > 0)
        .map((l) => ({ productId: l.product.id, qty: l.qty }));

      if (body.length === 0) {
        setErr("Your cart is empty or items are out of stock.");
        setSubmitting(false);
        return;
      }

      const r = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ items: body, locale: "en" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed to create checkout session.");

      // 1) If server returns a direct URL, prefer navigating there (Stripe-hosted)
      if (j?.url) {
        window.location.href = j.url as string;
        return;
      }

      // 2) Fallback: redirect via stripe-js with sessionId
      const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
      const stripe = await loadStripe(pk);
      if (!stripe) throw new Error("Stripe failed to initialize.");
      const { error } = await stripe.redirectToCheckout({ sessionId: j.sessionId });
      if (error) throw error;
    } catch (e: any) {
      setErr(e?.message || "Checkout failed.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold mb-4">Checkout</h1>
        <p className="opacity-70">Loading your cart…</p>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold mb-4">Checkout</h1>
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
        <h1 className="text-3xl font-extrabold">Checkout</h1>
        <Link
          href="/en/cart"
          className="rounded bg-white/10 hover:bg-white/20 px-3 py-2 text-sm"
        >
          Back to cart
        </Link>
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="opacity-70 text-sm mb-3">Order summary</div>
        <div className="space-y-2">
          {lines.map((l) => (
            <div
              key={l.product.id}
              className="flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="truncate font-semibold">
                  {l.product.productName && l.product.productName.trim().length > 0
                    ? l.product.productName
                    : `${l.product.artist ?? ""}${
                        l.product.artist && l.product.trackTitle ? " – " : " "
                      }${l.product.trackTitle ?? l.product.slug}`}
                </div>
                <div className="text-xs opacity-70">
                  {l.qty} × {l.unitPrice.toFixed(2)} €
                </div>
                {l.max > 0 && l.qty > l.max && (
                  <div className="text-xs text-amber-300">
                    Quantity reduced to stock: {l.max}
                  </div>
                )}
                {l.max === 0 && (
                  <div className="text-xs text-red-300">Out of stock</div>
                )}
              </div>
              <div className="shrink-0 font-semibold">
                {l.lineTotal.toFixed(2)} €
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-end gap-6">
          <div className="text-right">
            <div className="opacity-70 text-sm">Subtotal</div>
            <div className="text-2xl font-extrabold">{subtotal.toFixed(2)} €</div>
            <div className="opacity-60 text-xs">
              Shipping is calculated at checkout.
            </div>
          </div>
          <button
            onClick={startCheckout}
            disabled={disabled || submitting}
            className="inline-flex items-center rounded bg-cyan-500 text-black px-5 py-3 font-semibold hover:bg-cyan-400 disabled:opacity-60"
          >
            {submitting ? "Redirecting…" : "Pay now"}
          </button>
        </div>

        {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
      </div>

      <div className="mt-6">
        <Link
          href="/en/shop"
          className="inline-flex items-center rounded bg-white/10 hover:bg-white/20 px-3 py-2 text-sm"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}