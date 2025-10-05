// components/CartButton.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import useMounted from "./useMounted";

type CartMap = Record<string, { qty: number; price?: number }>;

function readCount(): number {
  try {
    const raw = localStorage.getItem("cart");
    if (!raw) return 0;
    const obj: CartMap = JSON.parse(raw);
    return Object.values(obj).reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  } catch {
    return 0;
  }
}

export default function CartButton({ href = "/de/cart" }: { href?: string }) {
  const mounted = useMounted();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!mounted) return;
    const update = () => setCount(readCount());
    update();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "cart") update();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("cart:changed", update as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cart:changed", update as EventListener);
    };
  }, [mounted]);

  // Immer die gleiche Struktur rendern: Badge ist beim SSR da, aber unsichtbar
  const badge =
    mounted ? (
      <span
        className="ml-1 inline-flex items-center justify-center rounded-full bg-cyan-500 text-black text-xs font-bold"
        style={{ minWidth: 22, height: 22, padding: "0 6px" }}
        aria-label={`${count} Artikel im Warenkorb`}
      >
        {count}
      </span>
    ) : (
      <span
        className="ml-1 inline-flex items-center justify-center rounded-full bg-cyan-500 text-black text-xs font-bold opacity-0"
        style={{ minWidth: 22, height: 22, padding: "0 6px" }}
        aria-hidden="true"
      >
        0
      </span>
    );

  return (
    <Link
      href={href}
      className="relative inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2"
      aria-label="Zum Warenkorb"
    >
      {/* Icon */}
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7 4h-2l-1 2h2l3.6 7.59-1.35 2.45A2 2 0 0 0 10 19h9v-2h-9l1.1-2h5.45a2 2 0 0 0 1.79-1.11L21 8H7.42l-.75-1.5L7 4Zm0 16a2 2 0 1 0 .001-4.001A2 2 0 0 0 7 20Zm10 0a2 2 0 1 0 .001-4.001A2 2 0 0 0 17 20Z"
        />
      </svg>
      <span className="text-sm font-semibold">Warenkorb</span>
      {badge}
    </Link>
  );
}