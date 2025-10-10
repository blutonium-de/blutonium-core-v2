// components/ShopGridClient.tsx
"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";

const PAGE_SIZE = 24 as const;

type Prod = {
  id: string;
  slug: string;
  artist?: string | null;
  trackTitle?: string | null;
  productName?: string | null;
  subtitle?: string | null;
  categoryCode: string; // bv, sv, bcd, scd, bhs, ss, dvd, bray
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
  // DVDs/BRay im Shop-Grid ausblenden (die haben eigene Seite)
  const stripMovies = (arr: Prod[]) =>
    (arr || []).filter(
      (p) => p.categoryCode !== "dvd" && p.categoryCode !== "bray"
    );

  // Paginierung: Seiten-Buffer, aktueller Index, End-Flag, Loading
  const [pages, setPages] = useState<Prod[][]>([stripMovies(initial || [])]);
  const [current, setCurrent] = useState<number>(0); // 0-basiert
  const [reachedLast, setReachedLast] = useState<boolean>(
    (initial?.length || 0) < PAGE_SIZE
  );
  const [loading, setLoading] = useState(false);

  // Beim Wechsel von Suchparametern neu initialisieren
  useEffect(() => {
    setPages([stripMovies(initial || [])]);
    setCurrent(0);
    setReachedLast((initial?.length || 0) < PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, genre, cat, JSON.stringify(initial?.map?.((p) => p.id))]);

  // Hilfen/Anzeige
  const flatCount = pages.reduce((n, pg) => n + pg.length, 0);
  const showingFrom =
    pages[current]?.length ? current * PAGE_SIZE + 1 : 0;
  const showingTo = current * PAGE_SIZE + (pages[current]?.length || 0);

  async function fetchPage(pageIndex: number): Promise<Prod[]> {
    const qs = new URLSearchParams();
    // Vinyl/CD only – wenn cat leer => 6 Shop-Kategorien
    qs.set("cat", cat ? cat : "bv,sv,bcd,scd,bhs,ss");
    qs.set("limit", String(PAGE_SIZE));
    qs.set("offset", String(pageIndex * PAGE_SIZE));
    if (q) qs.set("q", q);
    if (genre) qs.set("genre", genre);

    const r = await fetch(`/api/public/products?${qs.toString()}`, {
      cache: "no-store",
    });
    const t = await r.text();
    let j: any;
    try {
      j = JSON.parse(t);
    } catch {
      j = t;
    }
    if (!r.ok) throw new Error((j && j.error) || "Fehler beim Laden");

    // API kann Array ODER { items: [...] } liefern
    const raw: Prod[] = Array.isArray(j) ? j : Array.isArray(j?.items) ? j.items : [];
    const filtered = stripMovies(raw);
    // Wenn die Rohmenge < PAGE_SIZE ist, sind wir am Ende
    if (raw.length < PAGE_SIZE) setReachedLast(true);
    return filtered;
  }

  async function loadMore() {
    if (loading || reachedLast) return;
    setLoading(true);
    try {
      const nextIndex = pages.length; // nächste Seite (0-basiert)
      const nextPage = await fetchPage(nextIndex);
      setPages((prev) => [...prev, nextPage]);
      setCurrent(nextIndex); // nach dem Laden direkt auf die neue Seite springen
    } finally {
      setLoading(false);
    }
  }

  // Zu Seite springen (lädt fehlende Seiten sequentiell nach)
  async function goToPage(idx: number) {
    if (idx < 0) idx = 0;
    if (idx < pages.length) {
      setCurrent(idx);
      return;
    }
    if (loading || reachedLast) return;
    setLoading(true);
    try {
      let i = pages.length;
      while (i <= idx && !reachedLast) {
        const pg = await fetchPage(i);
        setPages((prev) => [...prev, pg]);
        i++;
        if (pg.length < PAGE_SIZE) break;
      }
      setCurrent(Math.min(idx, i - 1));
    } finally {
      setLoading(false);
    }
  }

  const canPrev = current > 0;
  const canNext = current < pages.length - 1 || !reachedLast;

  return (
    <div className="mt-6">
      {/* Grid */}
      <div
        className="
          grid grid-cols-2 gap-x-2 gap-y-3
          sm:[grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]
          sm:gap-x-2 sm:gap-y-3
        "
      >
        {(pages[current] || []).map((p) => (
          <ProductCard key={p.id} p={p as any} />
        ))}
      </div>

      {/* Pager */}
      <div className="mt-8 flex flex-col items-center gap-3">
        {/* Status */}
        <div className="text-sm opacity-70">
          {showingFrom === 0 ? (
            <>Keine Treffer.</>
          ) : reachedLast ? (
            <>
              Zeige <span className="font-medium">{showingFrom}</span>–
              <span className="font-medium">{showingTo}</span> von{" "}
              <span className="font-medium">{flatCount}</span>
            </>
          ) : (
            <>
              Zeige <span className="font-medium">{showingFrom}</span>–
              <span className="font-medium">{showingTo}</span> (mehr verfügbar)
            </>
          )}
        </div>

        {/* Buttons: Zurück / Seitenzahlen / Weiter */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => canPrev && goToPage(current - 1)}
            disabled={!canPrev || loading}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50"
            aria-label="Vorherige Seite"
          >
            ← Zurück
          </button>

          {/* Bisher geladene Seiten */}
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => goToPage(i)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-lg border text-sm ${
                i === current
                  ? "border-cyan-400 bg-cyan-400/10 text-cyan-200"
                  : "border-white/15 bg-white/5 hover:bg-white/10"
              }`}
              aria-current={i === current ? "page" : undefined}
              aria-label={`Seite ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}

          {/* Platzhalter-Nr für „nächste“ Seite, wenn vermutlich mehr existiert */}
          {!reachedLast && (
            <button
              onClick={() => goToPage(current + 1)}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border text-sm border-white/15 bg-white/5 hover:bg-white/10"
              title="Nächste Seite (wird bei Bedarf nachgeladen)"
              aria-label={`Seite ${pages.length + 1}`}
            >
              {pages.length + 1}
            </button>
          )}

          <button
            onClick={() => canNext && goToPage(current + 1)}
            disabled={!canNext || loading}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50"
            aria-label="Nächste Seite"
          >
            Weiter →
          </button>
        </div>

        {/* „Weitere 24 laden“ – klassisch */}
        <div className="mt-2">
          {reachedLast && current >= pages.length - 1 ? (
            <div className="text-sm opacity-60">Alles geladen.</div>
          ) : (
            <button
              onClick={loadMore}
              disabled={loading || reachedLast}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-60"
            >
              {loading ? "Lade …" : `Weitere ${PAGE_SIZE} laden`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}