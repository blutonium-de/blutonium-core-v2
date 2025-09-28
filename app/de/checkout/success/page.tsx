// app/de/checkout/success/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
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
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = search.get("session_id") || "";

    // Warenkorb leeren
    try {
      localStorage.removeItem("cart");
      window.dispatchEvent(new CustomEvent("cart:changed"));
    } catch {}

    if (sessionId) {
      // Backend informieren → reduziert Bestände, deaktiviert bei 0
      fetch(`/api/checkout/confirm?session_id=${encodeURIComponent(sessionId)}`, {
        method: "POST",
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((j) => {
          if (!j?.ok) throw new Error(j?.error || "Fehler beim Bestätigen");
          setMsg("Bestellung verarbeitet ✔");
        })
        .catch((e) => {
          console.error("Checkout confirm error:", e);
          setMsg("Bestellung gespeichert, aber Bestände konnten nicht aktualisiert werden.");
        });
    }
  }, [search, router]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl sm:text-4xl font-extrabold">
        Danke für deine Bestellung!
      </h1>
      <p className="mt-2 opacity-80">
        Deine Zahlung war erfolgreich. Du erhältst in Kürze eine Bestätigung per
        E-Mail.
      </p>
      {msg && <p className="mt-2 text-sm opacity-70">{msg}</p>}
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