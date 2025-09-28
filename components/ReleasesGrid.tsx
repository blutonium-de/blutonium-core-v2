// components/ReleasesGrid.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import ReleaseLinks from "./ReleaseLinks";

type Release = {
  id: string;
  title: string;
  type?: string | null;        // "ALBUM" | "SINGLE" | "EP" | "COMPILATION" | …
  year?: number | null;
  releaseDate?: string | null; // ISO
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
  const [kind, setKind] = useState<Kind>("all"); // Chips-Filter
  const [error, setError] = useState<string | null>(null);

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
    return () => {
      alive = false;
    };
  }, []);

  // verfügbare Jahre (desc)
  const years = useMemo(() => {
    return Array.from(
      new Set(items.map((r) => r.year || 0).filter(Boolean))
    ).sort((a, b) => b - a);
  }, [items]);

  // gefilterte Releases nach Kind
  const filtered = useMemo(() => {
    if (kind === "all") return items;
    return items.filter((r) => normalizeKind(r.type) === kind);
  }, [items, kind]);

  if (loading) return <div className="mt-6 opacity-80">Lade …</div>;
  if (error) return <div className="mt-6 text-red-400">{error}</div>;

  // Jahre → Gruppen
  return (
    <>
      {/* Kategorie-Chips */}
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

      {/* Jahres-Navi (Anchors) */}
      {years.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {years.map((y) => (
            <a
              key={y}
              href={`#y${y}`}
              className="px-3 py-1 rounded bg-white/8 text-sm hover:bg-white/15"
            >
              {y}
            </a>
          ))}
        </div>
      )}

      {/* Gruppiert nach Jahr */}
      <div className="mt-8 space-y-12">
        {years.map((y) => {
          const group = filtered
            .filter((r) => r.year === y)
            .slice()
            .sort((a, b) => {
              // absteigend nach Datum, Fallback Titel
              const ad = a.releaseDate || "";
              const bd = b.releaseDate || "";
              if (ad > bd) return -1;
              if (ad < bd) return 1;
              return a.title.localeCompare(b.title);
            });

          if (group.length === 0) return null;

          return (
            <section key={y} id={`y${y}`} className="scroll-mt-24">
              <h2 className="text-xl font-bold mb-3">{y}</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.map((r) => (
                  <article
                    key={r.id}
                    className="rounded-2xl bg-white/5 border border-white/10 p-3"
                  >
                    {/* 250×250 Cover */}
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
                      {/* Meta */}
                      <div className="text-[11px] uppercase opacity-70 mb-1">
                        <span className="px-2 py-0.5 rounded bg-white/10">
                          {(r.type || "ALBUM").toString()}
                        </span>
                        {r.label ? <span className="ml-2">Label: {r.label}</span> : null}
                        {r.catalog ? <span className="ml-2">Cat#: {r.catalog}</span> : null}
                      </div>

                      {/* Titel + Artists */}
                      <div className="font-semibold leading-snug">{r.title}</div>
                      {r.artists ? (
                        <div className="text-sm opacity-80">{r.artists}</div>
                      ) : null}

                      {/* Links */}
                      <div className="mt-2">
                        <ReleaseLinks
                          spotifyUrl={r.spotifyUrl || undefined}
                          appleUrl={r.appleUrl || undefined}
                          beatportUrl={r.beatportUrl || undefined}
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