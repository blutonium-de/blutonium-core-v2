/// components/ReleasesGrid.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReleaseLinks from "./ReleaseLinks";

type Release = {
  id: string;
  title: string;
  type?: string | null;
  year?: number | null;
  releaseDate?: string | null;
  artists?: string | null;
  label?: string | null;
  catalog?: string | null;
  cover?: string | null;
  spotifyUrl?: string | null;
  appleUrl?: string | null;
  beatportUrl?: string | null;
};

type Kind = "all" | "single" | "album" | "comp";

function normalizeKind(t?: string | null): Kind {
  const s = (t || "").toUpperCase();
  if (s.includes("COMPILATION")) return "comp";
  if (s.includes("ALBUM") && !s.includes("SINGLE")) return "album";
  if (s.includes("SINGLE") || s.includes("EP")) return "single";
  return "all";
}

export default function ReleasesGrid() {
  const [items, setItems] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<Kind>("all");
  const [error, setError] = useState<string | null>(null);
  const [activeYear, setActiveYear] = useState<number | null>(null);

  // sections je Jahr
  const secRefs = useRef<Map<number, HTMLElement>>(new Map());

  // Daten laden
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/spotify/releases", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Fehler beim Laden");
        if (alive) setItems(Array.isArray(j?.items) ? j.items : []);
      } catch (e: any) {
        if (alive) setError(e?.message || "Fehler");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const years = useMemo(
    () =>
      Array.from(new Set(items.map((r) => r.year || 0).filter(Boolean))).sort(
        (a, b) => b - a
      ),
    [items]
  );

  const filtered = useMemo(
    () => (kind === "all" ? items : items.filter((r) => normalizeKind(r.type) === kind)),
    [items, kind]
  );

  // Aktives Jahr beim Scrollen ermitteln
  useEffect(() => {
    if (years.length === 0) return;
    const map = secRefs.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const yAttr = e.target.getAttribute("data-year");
            const y = yAttr ? Number(yAttr) : NaN;
            if (!Number.isNaN(y)) setActiveYear(y);
          }
        }
      },
      {
        rootMargin: "-45% 0px -50% 0px",
        threshold: 0.01,
      }
    );
    years.forEach((y) => {
      const el = map.get(y);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [years, filtered]);

  function scrollToYear(y: number) {
    const el = secRefs.current.get(y);
    if (!el) return;
    history.replaceState(null, "", `#y${y}`);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loading) return <div className="mt-6 opacity-80">Lade …</div>;
  if (error) return <div className="mt-6 text-red-400">{error}</div>;

  return (
    <>
      {/* Kategorien */}
      <div className="mt-6 flex flex-wrap gap-2">
        {([
          ["all", "Alle"],
          ["single", "Singles & EPs"],
          ["album", "Alben"],
          ["comp", "Compilations"],
        ] as [Kind, string][])?.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`px-4 py-1.5 rounded-full text-sm transition ${
              kind === k ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* FIXED Yearbar (unter der Navbar) */}
      {years.length > 0 && (
        <>
          <div className="fixed left-0 right-0 top-16 z-40 bg-black/70 backdrop-blur border-b border-white/10">
            <div className="mx-auto max-w-6xl px-4">
              <div className="flex gap-2 overflow-x-auto py-2">
                {years.map((y) => {
                  const isActive = activeYear === y;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => scrollToYear(y)}
                      className={`shrink-0 px-3 py-1 rounded text-sm transition ${
                        isActive
                          ? "bg-cyan-500 text-black font-semibold"
                          : "bg-white/8 hover:bg-white/15"
                      }`}
                      aria-current={isActive ? "true" : undefined}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Spacer, damit der Content nicht unter die fixed Leiste rutscht */}
          <div className="h-[44px]" />
        </>
      )}

      {/* Gruppen */}
      <div className="mt-6 space-y-12">
        {years.map((y) => {
          const group = filtered
            .filter((r) => r.year === y)
            .slice()
            .sort((a, b) => {
              const ad = a.releaseDate || "";
              const bd = b.releaseDate || "";
              if (ad > bd) return -1;
              if (ad < bd) return 1;
              return a.title.localeCompare(b.title);
            });

        if (group.length === 0) return null;

        return (
          <section
            key={y}
            id={`y${y}`}
            data-year={y}
            ref={(el) => {
              if (el) secRefs.current.set(y, el);
              else secRefs.current.delete(y);
            }}
            className="scroll-mt-[120px]"
          >
            <h2 className="text-xl font-bold mb-3">{y}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {group.map((r) => (
                <article
                  key={r.id}
                  className="rounded-2xl bg-white/5 border border-white/10 p-3"
                >
                  <div className="mx-auto w-[250px] h-[250px] rounded-lg overflow-hidden bg-black/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.cover || "/placeholder.png"}
                      alt={r.title}
                      width={250}
                      height={250}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  <div className="mt-3">
                    <div className="text-[11px] uppercase opacity-70 mb-1">
                      <span className="px-2 py-0.5 rounded bg-white/10">
                        {(r.type || "ALBUM").toString()}
                      </span>
                      {r.label ? <span className="ml-2">Label: {r.label}</span> : null}
                      {r.catalog ? <span className="ml-2">Cat#: {r.catalog}</span> : null}
                    </div>

                    <div className="font-semibold leading-snug">{r.title}</div>
                    {r.artists ? (
                      <div className="text-sm opacity-80">{r.artists}</div>
                    ) : null}

                    <div className="mt-2">
                      <ReleaseLinks
                        spotifyUrl={r.spotifyUrl || undefined}
                        appleUrl={r.appleUrl || undefined}
                        beatportUrl={r.beatportUrl || undefined}
                        artist={r.artists || undefined}
                        title={r.title || undefined}
                        compact
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}

        {filtered.length === 0 && (
          <p className="opacity-70 mt-6">Keine Releases gefunden.</p>
        )}
      </div>
    </>
  );
}