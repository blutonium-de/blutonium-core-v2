// app/de/cart/add/page.tsx
"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function AddToCartPage() {
  const params = useSearchParams();

  useEffect(() => {
    try {
      const id = params.get("pid");
      const name = params.get("name") || "Artikel";

      if (id) {
        const raw = localStorage.getItem("cart");
        const cart: Record<string, { id: string; qty: number }> = raw ? JSON.parse(raw) : {};
        const cur = cart[id]?.qty || 0;
        cart[id] = { id, qty: cur + 1 };
        localStorage.setItem("cart", JSON.stringify(cart));
      }
    } catch (e) {
      console.error("AddToCartPage error:", e);
      // auch bei Fehler: weiterleiten, damit du nicht festhängst
    } finally {
      // HARTE, absolute Navigation (ohne Router), minimal verzögert
      const go = () => {
        try {
          window.location.href = "/de/merch";
        } catch {
          window.location.assign("/de/merch");
        }
      };
      // 0ms reicht normalerweise – 50ms geben wir als Sicherheits-Puffer
      setTimeout(go, 50);
    }
  }, [params]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Wird zum Warenkorb weitergeleitet …</h1>
      <p className="text-white/70 mt-2">Einen Moment bitte.</p>
    </div>
  );
}