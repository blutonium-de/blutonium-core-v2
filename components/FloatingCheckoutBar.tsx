// components/FloatingCheckoutBar.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  href?: string;
};

export default function FloatingCheckoutBar({ href = "/de/cart" }: Props) {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function readCart() {
      try {
        const raw =
          localStorage.getItem("cart") ||
          localStorage.getItem("cart_v1") ||
          "{}";
        const obj = JSON.parse(raw || "{}") as Record<string, { qty?: number }>;
        const c = Object.values(obj).reduce((sum, it) => sum + (it?.qty ?? 0), 0);
        setCount(c);
        setVisible(c > 0);
      } catch {
        setCount(0);
        setVisible(false);
      }
    }
    readCart();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "cart" || e.key === "cart_v1") readCart();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="text-sm opacity-80">
          {count} {count === 1 ? "Artikel" : "Artikel"} im Warenkorb
        </div>
        <Link
          href={href}
          className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-black hover:bg-cyan-400"
        >
          Zum Warenkorb
        </Link>
      </div>
    </div>
  );
}