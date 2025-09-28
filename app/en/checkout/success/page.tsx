"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CheckoutSuccessPage() {
  // IMPORTANT: wrap everything that uses useSearchParams in Suspense
  return (
    <Suspense fallback={<div className="p-6">Loading order confirmation …</div>}>
      <CheckoutSuccessInner />
    </Suspense>
  );
}

function CheckoutSuccessInner() {
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    const sessionId = search.get("session_id") || "";
    try {
      localStorage.removeItem("cart");
    } catch {}

    // stay here OR redirect if needed:
    // router.replace("/en/cart");
  }, [search, router]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl sm:text-4xl font-extrabold">Thank you for your order!</h1>
      <p className="mt-2 opacity-80">
        Your payment was successful. You will receive a confirmation email shortly.
      </p>
      <div className="mt-6">
        <a
          href="/en/shop"
          className="inline-block px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
        >
          Continue shopping
        </a>
      </div>
    </div>
  );
}