// app/de/checkout/success/page.tsx
"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CheckoutSuccessPage() {
  // WICHTIG: Alles, was useSearchParams nutzt, in Suspense kapseln
  return (
    <Suspense fallback={<div className="p-6">Lade Bestellbestätigung …</div>}>
      <CheckoutSuccessInner />
    </Suspense>
  );
}

function CheckoutSuccessInner() {
  const router = useRouter();
  const search = useSearchParams();

  // Beispiel: session_id aus Query holen, Cart leeren, Danke anzeigen / weiterleiten
  useEffect(() => {
    const sessionId = search.get("session_id") || "";
    // → hier deine bestehende Success-Logik:
    //  - optional: /api/checkout/verify?session_id=...
    //  - Warenkorb leeren
    try {
      localStorage.removeItem("cart");
    } catch {}

    // Wenn du hier bleiben willst, tue nichts.
    // Oder kleine Verzögerung + Redirect zurück zum Shop/Warenkorb:
    // router.replace("/de/cart");
  }, [search, router]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl sm:text-4xl font-extrabold">Danke für deine Bestellung!</h1>
      <p className="mt-2 opacity-80">
        Deine Zahlung war erfolgreich. Du erhältst in Kürze eine Bestätigung per E-Mail.
      </p>
      <div className="mt-6">
        <a
          href="/de/shop"
          className="inline-block px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
        >
          Weiter shoppen
        </a>
      </div>
    </div>
  );
}