"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocalCart } from "./useLocalCart";

type Prod = {
  id: string;
  slug: string;
  productName?: string | null;
  artist?: string | null;
  trackTitle?: string | null;
  priceEUR: number;
  image: string;
  categoryCode: string;
  stock?: number | null;
};

export default function CartClient() {
  const cart = useLocalCart();
  const ids = useMemo(() => Object.keys(cart), [cart]);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Prod[]>([]);

  useEffect(() => {
    let aborted = false;

    async function load() {
      if (!ids.length) {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set("ids", ids.join(","));
        // kleine Public-Route, siehe unten
        const r = await fetch(`/api/public/products/by-ids?${qs.toString()}`, { cache: "no-store" });
        const t = await r.text();
        let j: any; try { j = JSON.parse(t); } catch { j = t; }
        if (!r.ok) throw new Error((j && j.error) || "load error");
        if (!aborted) setItems(Array.isArray(j?.items) ? j.items : []);
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    load();
    return () => { aborted = true; };
  }, [ids.join(",")]); // absichtlich join für stable dep

  const lineItems = items.map(p => ({
    p,
    qty: Math.max(1, cart[p.id]?.qty ?? 1),
    price: cart[p.id]?.price ?? p.priceEUR,
  }));

  const total = lineItems.reduce((s, li) => s + li.qty * (li.price ?? 0), 0);

  if (!ids.length) {
    return (
      <div className="mt-6">
        <p>Dein Warenkorb ist leer.</p>
        <a href="/de/shop" className="inline-flex mt-3 px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
          Weiter shoppen
        </a>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {loading && <div className="opacity-70 text-sm mb-3">Lade Artikel …</div>}

      <ul className="space-y-3">
        {lineItems.map(({ p, qty, price }) => (
          <li key={p.id} className="flex gap-3 items-center rounded-xl border border-white/10 bg-white/5 p-3">
            <a href={`/de/shop/${p.slug}`} className="shrink-0">
              <img
                src={p.image || "/placeholder.png"}
                alt={p.productName || p.slug}
                className="h-20 w-20 object-cover rounded-lg"
                loading="lazy"
              />
            </a>
            <div className="flex-1 min-w-0">
              <a href={`/de/shop/${p.slug}`} className="font-semibold line-clamp-1">
                {p.productName || [p.artist, p.trackTitle].filter(Boolean).join(" – ") || p.slug}
              </a>
              <div className="text-xs opacity-70 mt-0.5">
                {p.categoryCode.toUpperCase()} · {qty} × {Number(price).toFixed(2)} €
              </div>
            </div>
            <div className="font-semibold whitespace-nowrap">
              {(qty * Number(price)).toFixed(2)} €
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center justify-between">
        <div className="text-sm opacity-80">{lineItems.length} Artikel</div>
        <div className="text-lg font-extrabold">{total.toFixed(2)} €</div>
      </div>

      <div className="mt-4 flex gap-2">
        <a href="/de/shop" className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">
          Weiter shoppen
        </a>
        <a href="/de/checkout" className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
          Zur Kasse
        </a>
      </div>
    </div>
  );
}