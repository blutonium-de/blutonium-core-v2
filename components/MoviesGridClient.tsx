// components/MoviesGridClient.tsx
"use client";

import { useState } from "react";
import ProductGrid from "@/components/ProductGrid";

const PAGE_SIZE = 50 as const;

type Prod = {
  id: string;
  slug: string;
  productName?: string | null;
  artist?: string | null;
  trackTitle?: string | null;
  priceEUR: number;
  image: string;
  images?: string[];
  stock?: number | null;
  genre?: string | null;
  format?: string | null;
  categoryCode: string;
};

export default function MoviesGridClient({
  initial,
  q,
  genre,
  type,
}: {
  initial: Prod[];
  q: string;
  genre: string;
  type: "all" | "dvd" | "bray";
}) {
  const [items, setItems] = useState<Prod[]>(initial || []);
  const [offset, setOffset] = useState<number>(initial.length || 0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<boolean>((initial?.length || 0) < PAGE_SIZE);

  async function loadMore() {
    if (loading || done) return;
    setLoading(true);

    try {
      const qs = new URLSearchParams();
      const cat = type === "dvd" ? "dvd" : type === "bray" ? "bray" : "dvd,bray";
      qs.set("limit", String(PAGE_SIZE));
      qs.set("offset", String(offset));
      qs.set("cat", cat);
      if (q) qs.set("q", q);
      if (genre) qs.set("genre", genre);

      const r = await fetch(`/api/public/products?${qs.toString()}`, { cache: "no-store" });
      const t = await r.text();
      let j: any; try { j = JSON.parse(t); } catch { j = t; }
      if (!r.ok) throw new Error((j && j.error) || "Fehler beim Laden");

      const next: Prod[] = Array.isArray(j) ? j : Array.isArray(j?.items) ? j.items : [];
      setItems((prev) => [...prev, ...next]);
      setOffset((o) => o + next.length);
      if (next.length < PAGE_SIZE) setDone(true);
    } catch {
      // Fehler optional anzeigen
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8">
      <ProductGrid products={items} />

      <div className="mt-6 flex justify-center">
        {done ? (
          <div className="text-sm opacity-60">Alles geladen.</div>
        ) : (
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-60"
          >
            {loading ? "Lade …" : `Weitere ${PAGE_SIZE} laden`}
          </button>
        )}
      </div>
    </div>
  );
}