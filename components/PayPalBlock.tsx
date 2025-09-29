// components/PayPalBlock.tsx
"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    paypal?: any;
  }
}

export default function PayPalBlock({ totalEUR }: { totalEUR: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID; // optional
    const clientId = id || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    // Fallback: wir hängen die Script-URL immer an
    const qs = new URLSearchParams({
      "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
      currency: "EUR",
      intent: "capture",
      commit: "true",
    });

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?${qs.toString()}`;
    script.async = true;
    script.onload = () => setReady(true);
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, []);

  useEffect(() => {
    if (!ready || !window.paypal || !containerRef.current) return;

    window.paypal.Buttons({
      style: { layout: "horizontal", color: "gold", shape: "rect", label: "paypal" },
      createOrder: async () => {
        const res = await fetch("/api/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountEUR: totalEUR, description: "Blutonium Order" }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || "create-order failed");
        return j.id; // PayPal Order ID
      },
      onApprove: async (data: any) => {
        const res = await fetch(`/api/paypal/capture-order/${data.orderID}`, { method: "POST" });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || "capture failed");
        // Weiterleitung auf deine Success-Seite
        window.location.href = "/de/checkout/success";
      },
      onError: (err: any) => {
        console.error("PayPal error", err);
        alert("PayPal-Zahlung fehlgeschlagen.");
      },
    }).render(containerRef.current);
  }, [ready, totalEUR]);

  return (
    <div className="mt-4">
      <div ref={containerRef} />
    </div>
  );
}