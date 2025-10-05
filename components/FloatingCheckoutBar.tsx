// components/FloatingCheckoutBar.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useMounted from "./useMounted";

type CartMap = Record<string, { qty: number; price?: number }>;

function readCount(): number {
  try {
    const raw = localStorage.getItem("cart");
    if (!raw) return 0;
    const obj: CartMap = JSON.parse(raw);
    return Object.values(obj).reduce((s, it) => s + (Number(it.qty) || 0), 0);
  } catch {
    return 0;
  }
}

export default function FloatingCheckoutBar({ href = "/de/cart" }: { href?: string }) {
  const mounted = useMounted();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!mounted) return;
    setCount(readCount());
    const onStorage = (e: StorageEvent) => {
      if (e.key === "cart") setCount(readCount());
    };
    const onCustom = () => setCount(readCount());
    window.addEventListener("storage", onStorage);
    window.addEventListener("cart:changed", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cart:changed", onCustom as EventListener);
    };
  }, [mounted]);

  // SSR: nichts rendern; nach Mount nur anzeigen, wenn Artikel im Korb sind
  if (!mounted || count <= 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-3 z-40 px-4">
      <div className="mx-auto max-w-6xl rounded-2xl border border-white/15 bg-black/85 backdrop-blur p-3 flex items-center justify-between">
        <div className="text-sm">
          {count} {count === 1 ? "Artikel" : "Artikel"} im Warenkorb
        </div>
        <Link
          href={href}
          className="rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-4 py-2"
        >
          Zur Kasse
        </Link>
      </div>
    </div>
  );
}