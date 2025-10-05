// app/de/checkout/success/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CheckoutSuccessPage() {
  const [done, setDone] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get("session_id"); // Stripe
    const isPaypal = url.searchParams.get("paypal") === "1";
    const orderId = url.searchParams.get("order_id");

    // Warenkorb local löschen (idempotent)
    try { localStorage.removeItem("cart"); } catch {}

    // Ohne orderId können wir keine Rechnung erzeugen → nur Danke-Seite
    if (!orderId) {
      setDone(true);
      return;
    }

    // Rechnung/Mails auslösen
    const run = async () => {
      try {
        const r = await fetch("/api/order/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || "Konnte Rechnung nicht erzeugen");
        if (j?.invoiceNumber) setInvoiceNumber(j.invoiceNumber);
        setDone(true);
      } catch (e: any) {
        setError(e?.message || "Fehler beim Erzeugen der Rechnung");
        setDone(true);
      }
    };

    // Stripe oder PayPal – in beiden Fällen best effort confirm
    // (Webhooks wären „cleaner“, aber hier reicht clientseitiges Triggern)
    run();
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl sm:text-4xl font-extrabold">Danke für Ihre Bestellung!</h1>
      <p className="mt-2 text-white/80">
        {done
          ? "Ihre Zahlung wurde verarbeitet. Die Quittung/Rechnung wird per E-Mail zugestellt."
          : "Verarbeite Zahlung … bitte warten …"}
      </p>

      {invoiceNumber && (
        <p className="mt-2 text-sm opacity-80">
          Rechnungsnummer: <span className="font-semibold">{invoiceNumber}</span>
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-400">
          Hinweis: {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-center gap-3">
        <Link
          href="/de/shop"
          className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
        >
          Weiter shoppen
        </Link>
        <Link
          href="/de"
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
        >
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}