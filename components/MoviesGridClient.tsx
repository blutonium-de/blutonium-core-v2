// components/MoviesGridClient.tsx
"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";

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
  fsk?: string | null;
};

export default function MoviesGridClient({
  initial,
  q,
  genre,
  type,
  pageSize = 24,
  showPager = false,
}: {
  initial: Prod[];
  q: string;
  genre: string;
  type: "all" | "dvd" | "bd";  // ⬅️ "bd" statt "bray"
  pageSize?: number;
  showPager?: boolean;
}) {
  const [items, setItems] = useState<Prod[]>(initial || []);
  const [offset, setOffset] = useState<number>(initial.length || 0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<boolean>((initial?.length || 0) < pageSize);
  const [page, setPage] = useState(1);

  // ✅ Reset bei Filterwechsel
  useEffect(() => {
    setItems(initial || []);
    setOffset(initial.length || 0);
    setPage(1);
    setDone((initial?.length || 0) < pageSize);
  }, [initial, q, genre, type, pageSize]);

  async function loadMore(nextPage?: number) {
    if (loading || done) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      const cat = type === "dvd" ? "dvd" : type === "bd" ? "bray" : "dvd,bray"; // ⬅️ map "bd" → "bray"
      qs.set("limit", String(pageSize));
      qs.set("offset", String((nextPage ? (nextPage - 1) : 0) * pageSize));
      qs.set("cat", cat);
      if (q) qs.set("q", q);
      if (genre) qs.set("genre", genre);

      const r = await fetch(`/api/public/products?${qs.toString()}`, { cache: "no-store" });
      const t = await r.text();
      let j: any; try { j = JSON.parse(t); } catch { j = t; }
      if (!r.ok) throw new Error((j && j.error) || "Fehler beim Laden");

      const next: Prod[] = Array.isArray(j) ? j : Array.isArray(j?.items) ? j.items : [];

      if (nextPage) {
        // bei Pager → komplette Seite ersetzen
        setItems(next);
        setPage(nextPage);
        setOffset(nextPage * pageSize);
      } else {
        // bei "Weitere laden" → anhängen
        setItems((prev) => [...prev, ...next]);
        setOffset((o) => o + next.length);
      }

      if (next.length < pageSize) setDone(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8">
      <div
        className="
          grid grid-cols-2 gap-x-2 gap-y-4 place-items-stretch
          sm:[grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]
          sm:gap-x-1 sm:place-items-center
        "
      >
        {items.map((p) => (
          <ProductCard key={p.id} p={p as any} />
        ))}
      </div>

      {/* Pagination */}
      {showPager ? (
        <div className="mt-8 flex justify-center items-center gap-4">
          <button
            onClick={() => loadMore(page - 1)}
            disabled={page <= 1 || loading}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40"
          >
            ← Zurück
          </button>
          <span className="text-sm opacity-70">Seite {page}</span>
          <button
            onClick={() => loadMore(page + 1)}
            disabled={done || loading}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40"
          >
            Weiter →
          </button>
        </div>
      ) : (
        <div className="mt-6 flex justify-center">
          {done ? (
            <div className="text-sm opacity-60">Alles geladen.</div>
          ) : (
            <button
              onClick={() => loadMore()}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-60"
            >
              {loading ? "Lade …" : `Weitere ${pageSize} laden`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}