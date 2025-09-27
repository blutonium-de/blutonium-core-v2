"use client";

import { useState } from "react";

type ProductBasic = {
  id: string;
  slug: string;
  productName?: string | null;
};

export default function AddToCartButton({ product }: { product: ProductBasic }) {
  const [busy, setBusy] = useState(false);

  function addToCart() {
    try {
      setBusy(true);

      const raw = typeof window !== "undefined" ? localStorage.getItem("cart") : null;
      const cart: Record<string, { id: string; qty: number }> = raw ? JSON.parse(raw) : {};

      const currentQty = cart[product.id]?.qty || 0;
      cart[product.id] = { id: product.id, qty: currentQty + 1 };

      localStorage.setItem("cart", JSON.stringify(cart));
      alert(`${product.productName || product.slug} wurde in den Warenkorb gelegt.`);
    } catch (e) {
      console.error("addToCart error:", e);
      alert("Fehler beim Hinzufügen zum Warenkorb.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={addToCart}
      disabled={busy}
      className="inline-block px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold disabled:opacity-50"
    >
      {busy ? "…" : "In den Warenkorb"}
    </button>
  );
}