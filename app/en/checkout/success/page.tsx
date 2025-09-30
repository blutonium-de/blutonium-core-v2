// app/en/checkout/success/page.tsx
"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function CheckoutSuccess() {
  useEffect(() => {
    try { localStorage.removeItem("cart"); window.dispatchEvent(new CustomEvent("cart:changed")); } catch {}
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold">Thanks for your order! 🎉</h1>
      <p className="mt-2 opacity-80">You’ll receive an order confirmation via email shortly.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/en/shop" className="rounded bg-cyan-500 text-black px-4 py-2 font-semibold hover:bg-cyan-400">
          Continue shopping
        </Link>
        <Link href="/en" className="rounded bg-white/10 hover:bg-white/20 px-4 py-2">Back to homepage</Link>
      </div>
    </div>
  );
}