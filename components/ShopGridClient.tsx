// components/ShopGridClient.tsx
"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";

const PAGE_SIZE = 50 as const;

type Prod = {
  id: string;
  slug: string;
  artist?: string | null;
  trackTitle?: string | null;
  productName?: string | null;
  subtitle?: string | null;
  categoryCode: string;
  condition?: string | null;
  priceEUR: number;
  image: string;
  images?: string[];
  stock?: number | null;
  genre?: string | null;
  format?: string | null;
};

export default function ShopGridClient({
  initial,
  q,
  genre,
  cat,
}: {
  initial: Prod[];
  q: string;
  genre: string;
  cat: string; // "", "bv", ...
}) {
  // --- State ---
  const [items, setItems]   = useState<Prod[]>(initial || []);
  const [offset, setOffset] = useState<number>(initial.length || 0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<boolean>((initial?.length || 0) < PAGE_SIZE);

  // ✅ Reset bei Filterwechsel (kein Refresh nötig)
  useEffect(() => {
    setItems(initial || []);
    setOffset(initial?.length || 0);
    setDone((initial?.length || 0) < PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, genre, cat, JSON.stringify(initial?.map?.((p) => p.id))]);

  async function loadMore() {
    if (loading || done) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      // Vinyl/CD only – wenn cat leer => alle 6 Shop-Kategorien
      qs.set("cat", cat ? cat : "bv,sv,bcd,scd,bhs,ss");
      qs.set("limit", String(PAGE_SIZE));
      qs.set("offset", String(offset));
      if (q) qs.set("q", q);
      if (genre) qs.set("genre", genre);

      const r = await fetch(`/api/public/products?${qs.toString()}`, { cache: "no-store" });
      const t = await r.text();
      let j: any; try { j = JSON.parse(t); } catch { j = t; }
      if (!r.ok) throw new Error((j && j.error) || "Fehler beim Laden");
      const next: Prod[] = Array.isArray(j?.items) ? j.items : [];

      setItems((prev) => [...prev, ...next]);
      setOffset((o) => o + next.length);
      if (next.length < PAGE_SIZE) setDone(true);
    } catch {
      // optional: Fehlermeldung
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      {/* Enges Grid – wie auf der Vinyl-Seite */}
      <div
        className="
          grid grid-cols-2 gap-x-2 gap-y-3
          sm:[grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]
          sm:gap-x-2 sm:gap-y-3
        "
      >
        {items.map((p) => (
          <ProductCard key={p.id} p={p as any} />
        ))}
      </div>

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