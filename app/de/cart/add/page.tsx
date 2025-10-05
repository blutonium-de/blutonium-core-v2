// app/de/cart/add/page.tsx
"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AddToCartPage() {
  // WICHTIG: useSearchParams MUSS innerhalb von <Suspense> sein
  return (
    <Suspense fallback={<div className="p-6">Lade …</div>}>
      <AddToCartInner />
    </Suspense>
  );
}

function AddToCartInner() {
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    // --- HIER deine bestehende Logik einfügen ---
    // Beispiel: id & qty aus Query lesen und zum Cart legen
    const id = search.get("id");
    const qty = Math.max(1, Number(search.get("qty") || 1));

    // TODO: Ersetze diesen Block durch deinen echten Cart-Add (Context/Server/LocalStorage)
    try {
      const raw = localStorage.getItem("cart") || "{}";
      const cart = JSON.parse(raw);
      cart[id || ""] = { ...(cart[id || ""] || {}), qty };
      localStorage.setItem("cart", JSON.stringify(cart));
    } catch {
      // ignorieren
    }
    // Danach weiterleiten in den Warenkorb (oder wohin du willst)
    router.replace("/de/cart");
  }, [search, router]);

  return <div className="p-6">Zum Warenkorb hinzufügen …</div>;
}