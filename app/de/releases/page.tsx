"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type Artist = { id: string; name: string; url?: string }
type Release = {
  id: string
  year: number
  releaseDate?: string | null
  title: string
  type: "album" | "single" | "compilation"
  label?: string | null
  coverUrl?: string | null
  artists: Artist[]
  spotifyUrl?: string
  appleUrl?: string
  beatportUrl?: string
  catalogNumber?: string | null
  credits?: string[]
}
type Filter = "all" | "single" | "album" | "compilation"

function cx(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(" ")
}

async function fetchPage(params: Record<string, string | number>) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => sp.set(k, String(v)))
  const base = typeof window === "undefined" ? "" : window.location.origin
  const r = await fetch(`${base}/api/releases?${sp.toString()}`, { cache: "no-store" })
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return (await r.json()) as { releases: Release[]; cursorNext: string | null }
}

export default function ReleasesPage() {
  const [data, setData] = useState<Release[]>([])
  const [cursorNext, setCursorNext] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [filter, setFilter] = useState<Filter>("all")
  const [activeYear, setActiveYear] = useState<number | null>(null)

  const yearRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Jahr gezielt vollständig nachladen (Label + Artists), optional mit Startdaten (seed)
  async function fillYear(year: number, seed?: Release[]) {
    let offset: number | null = 0
    let more = true
    // mit Seed beginnen, sonst mit aktuellem State
    const start = seed ?? data
    let local = new Map<string, Release>(start.map(r => [r.id, r]))

    while (more) {
      const res = await fetchPage({ year, limit: 50, pages: 5, cursor: offset ?? 0 })
      for (const it of res.releases) local.set(it.id, it)
      offset = res.cursorNext ? Number(res.cursorNext) : null
      // Artists kommen ohne Cursor — wenn kein cursorNext, ist für dieses Jahr „voll“
      more = !!offset
    }

    const merged = Array.from(local.values()).sort((b, a) =>
      (a.releaseDate || "").localeCompare(b.releaseDate || "")
    )
    setData(merged)
  }

  // Initial: 2 Seiten global (Label-Suche), DANN neuestes Jahr sofort komplett nachladen
  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true); setError(null)
        const res = await fetchPage({ limit: 50, pages: 2 })
        const map = new Map<string, Release>()
        for (const it of res.releases) map.set(it.id, it)
        const merged = Array.from(map.values()).sort((b, a) =>
          (a.releaseDate || "").localeCompare(b.releaseDate || "")
        )
        setData(merged)
        setCursorNext(res.cursorNext)

        // neuestes Jahr ermitteln und direkt vollständig laden
        const years = merged.map(r => r.year).filter(Boolean)
        if (years.length) {
          const newest = Math.max(...years)
          setActiveYear(newest)
          await fillYear(newest, merged) // Seed = bereits geladene Releases
        }
      } catch (e: any) {
        setError(e.message || "Fehler beim Laden")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Jahr-Klick: smooth scroll + vollständig laden
  function onYearClick(year: number) {
    setActiveYear(year)
    setTimeout(() => {
      const el = yearRefs.current[String(year)]
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 60)
    void (async () => {
      try { setLoading(true); await fillYear(year) } finally { setLoading(false) }
    })()
  }

  // Gruppierung & Sortierung für Anzeige
  const grouped = useMemo(() => {
    const src = (data || [])
      .filter(r => (filter === "all" ? true : r.type === filter))
      .sort((a, b) => (b.releaseDate || "").localeCompare(a.releaseDate || ""))

    const map = new Map<number, Release[]>()
    for (const r of src) {
      if (!map.has(r.year)) map.set(r.year, [])
      map.get(r.year)!.push(r)
    }
    return Array.from(map.entries()).sort(([a], [b]) => b - a)
  }, [data, filter])

  const yearList = useMemo(() => grouped.map(([year]) => year), [grouped])

  return (
    <div className="max-w-6xl mx-auto">
      <header className="pt-8 pb-6">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
          Blutonium Records Veröffentlichungen
        </h1>
        <p className="mt-3 text-white/80">
          Filtere nach Typ, springe per Jahr & entdecke alle Releases. Neueste zuerst.
        </p>

        {/* Filter-Tabs */}
        <div className="mt-6 flex flex-wrap gap-3">
          {([
            ["all", "Alle"],
            ["single", "Singles & EPs"],
            ["album", "Alben"],
            ["compilation", "Compilations"],
          ] as [Filter, string][])
            .map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cx(
                  "px-4 py-2 rounded-lg border text-sm transition",
                  filter === key
                    ? "bg-white/15 border-white/25"
                    : "bg-white/5 hover:bg-white/10 border-white/10"
                )}
              >
                {label}
              </button>
            ))}
        </div>

        {/* Jahres-Leiste */}
        {yearList.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {yearList.map((year) => (
                <button
                  key={year}
                  onClick={() => onYearClick(year)}
                  className={cx(
                    "px-3 py-1.5 rounded-md text-sm border transition",
                    activeYear === year
                      ? "bg-white/20 border-white/30"
                      : "bg-white/5 hover:bg-white/10 border-white/10"
                  )}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Lade-/Fehlerzustände */}
      {!data.length && !error && (
        <div className="py-20 text-center text-white/70">Lade Releases …</div>
      )}
      {error && <div className="py-10 text-center text-red-300">Fehler: {error}</div>}

      {/* Jahre + Releases */}
      <div className="space-y-12 pb-16">
        {grouped.map(([year, items]) => (
          <section
            key={year}
            ref={(el: HTMLDivElement | null) => {
              yearRefs.current[String(year)] = el
            }}
            className="scroll-mt-28"
          >
            <h2 className="text-2xl font-bold mb-5">{year}</h2>

            {/* Grid 2/3 Spalten – Cover fix 200px */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((r) => (
                <article
                  key={r.id}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4"
                >
                  {/* Cover */}
                  <div className="shrink-0">
                    {r.coverUrl ? (
                      <img
                        src={r.coverUrl}
                        alt={`${r.title} Cover`}
                        className="w-[200px] h-[200px] object-cover rounded-xl"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-[200px] h-[200px] rounded-xl bg-white/10 grid place-items-center text-white/40">
                        Kein Cover
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-xs uppercase tracking-wide px-2 py-0.5 rounded bg-white/10 border border-white/10">
                        {r.type === "single" ? "Single/EP" : r.type === "album" ? "Album" : "Compilation"}
                      </span>
                      {r.label && <span className="text-xs text-white/50">Label: {r.label}</span>}
                      {r.catalogNumber && <span className="text-xs text-white/50">Cat#: {r.catalogNumber}</span>}
                    </div>

                    <h3 className="mt-1 text-lg sm:text-xl font-semibold">{r.title}</h3>
                    {r.artists?.length > 0 && (
                      <p className="text-white/80">
                        {r.artists.map((a, i) => (
                          <span key={a.id}>
                            {i > 0 ? ", " : ""}
                            {a.url ? (
                              <a className="underline underline-offset-2 hover:text-cyan-300" href={a.url} target="_blank" rel="noreferrer">
                                {a.name}
                              </a>
                            ) : a.name}
                          </span>
                        ))}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.spotifyUrl && (
                        <a
                          href={r.spotifyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-md text-sm bg-[#1DB954]/20 hover:bg-[#1DB954]/30 border border-white/10"
                        >
                          Spotify
                        </a>
                      )}
                      {r.appleUrl && (
                        <a
                          href={r.appleUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-md text-sm bg-white/10 hover:bg-white/20 border border-white/10"
                        >
                          Apple Music
                        </a>
                      )}
                      {r.beatportUrl && (
                        <a
                          href={r.beatportUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-md text-sm bg-white/10 hover:bg-white/20 border border-white/10"
                        >
                          Beatport
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        {/* Globales Paging weiter unten */}
        {!!cursorNext && (
          <div className="text-center">
            <button
              disabled={loading}
              onClick={async () => {
                try {
                  setLoading(true)
                  const res = await fetchPage({ limit: 50, pages: 1, cursor: cursorNext! })
                  const map = new Map<string, Release>(data.map(r => [r.id, r]))
                  for (const it of res.releases) map.set(it.id, it)
                  const merged = Array.from(map.values()).sort((b, a) =>
                    (a.releaseDate || "").localeCompare(b.releaseDate || "")
                  )
                  setData(merged)
                  setCursorNext(res.cursorNext)
                } finally {
                  setLoading(false)
                }
              }}
              className="mt-8 px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50"
            >
              {loading ? "Laden …" : "Mehr laden"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}