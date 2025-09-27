// app/de/checkout/success/page.tsx
"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function CheckoutSuccessPage() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");

  useEffect(() => {
    // Nach Erfolg: Cart leeren
    try {
      localStorage.removeItem("cart");
    } catch {}
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-extrabold">Danke für deine Bestellung!</h1>
      <p className="text-white/70 mt-3">
        Deine Zahlung wurde erfolgreich verarbeitet.
      </p>
      {sessionId && (
        <p className="text-white/50 mt-2 text-sm">Session: {sessionId}</p>
      )}
      <a
        href="/de/shop"
        className="inline-block mt-6 px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
      >
        Weiter shoppen
      </a>
    </div>
  );
}