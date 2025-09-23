// app/de/videos/page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"

type Video = {
  id: string
  title: string
  thumb: string
  publishedAt: string
  url: string
}

type ApiResponse =
  | { videos: Video[]; nextPageToken?: string | null; source?: string; error?: undefined; steps?: any }
  | { error: string; source?: string; status?: number; steps?: any; videos?: undefined }

function cx(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(" ")
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // UI: Suche / Filter / Sortierung
  const [query, setQuery] = useState("")
  const [year, setYear] = useState<number | "all">("all")
  const [sort, setSort] = useState<"newer" | "older">("newer")
  const [debug, setDebug] = useState(false)
  const [debugSteps, setDebugSteps] = useState<any>(null)

  async function fetchVideos(opts?: { cursor?: string | null; replace?: boolean }) {
    try {
      setLoading(true)
      setError(null)

      const sp = new URLSearchParams()
      sp.set("max", "24")
      if (opts?.cursor) sp.set("pageToken", String(opts.cursor))

      const base = typeof window === "undefined" ? "" : window.location.origin
      const r = await fetch(`${base}/api/youtube?${sp.toString()}`, { cache: "no-store" })
      const data: ApiResponse = await r.json()

      if ("error" in data) {
        setError(data.error || "Unbekannter Fehler")
        setVideos([])
        setNextPageToken(null)
        setDebugSteps((data as any).steps ?? null)
        return
      }

      const list = data.videos ?? []
      setDebugSteps((data as any).steps ?? null)

      setVideos((prev) => (opts?.replace ? list : [...prev, ...list]))
      setNextPageToken(data.nextPageToken ?? null)
    } catch (e: any) {
      setError(e?.message || "Fehler beim Laden")
      setVideos([])
      setNextPageToken(null)
    } finally {
      setLoading(false)
    }
  }

  // Initial laden
  useEffect(() => {
    fetchVideos({ replace: true })
  }, [])

  // Such-/Filter-/Sortier-View ableiten
  const filtered = useMemo(() => {
    let out = videos

    if (query.trim()) {
      const q = query.toLowerCase()
      out = out.filter((v) => v.title.toLowerCase().includes(q))
    }

    if (year !== "all") {
      out = out.filter((v) => {
        const y = new Date(v.publishedAt).getFullYear()
        return y === year
      })
    }

    out = [...out].sort((a, b) => {
      const da = new Date(a.publishedAt).getTime()
      const db = new Date(b.publishedAt).getTime()
      return sort === "newer" ? db - da : da - db
    })

    return out
  }, [videos, query, year, sort])

  const years = useMemo(() => {
    const set = new Set<number>()
    for (const v of videos) set.add(new Date(v.publishedAt).getFullYear())
    return Array.from(set).sort((a, b) => b - a)
  }, [videos])

  return (
    <div className="max-w-6xl mx-auto px-4 pb-16">
      <header className="pt-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Videos</h1>
        <p className="mt-3 text-white/80">
          Neueste Uploads vom offiziellen Blutonium Records YouTube-Kanal.
        </p>

        {/* Debug-Schalter */}
        <div className="mt-6 flex flex-wrap gap-3 items-center">
          <button
            onClick={() => setDebug((v) => !v)}
            className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
          >
            {debug ? "Debug ausblenden" : "Debug anzeigen"}
          </button>

          {/* Suche */}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche nach Titel..."
            className="w-full sm:w-80 px-4 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:border-white/20"
          />

          {/* Jahres-Filter */}
          <select
            value={year}
            onChange={(e) => setYear(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10"
          >
            <option value="all">Alle Jahre</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* Sortierung */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10"
          >
            <option value="newer">Neu → Alt</option>
            <option value="older">Alt → Neu</option>
          </select>
        </div>
      </header>

      {/* Lade-/Fehlerzustände */}
      <div className="mt-8">
        {loading && videos.length === 0 && (
          <div className="py-10 text-center text-white/70">Lade Videos …</div>
        )}

        {error && videos.length === 0 && (
          <div className="py-10 text-center text-red-300">
            Fehler: {error}
            <div className="mt-2 text-white/50 text-sm">
              Kein Feed verfügbar (API geblockt/RSS leer)
            </div>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="py-10 text-center text-white/70">Keine aktuellen Videos gefunden.</div>
        )}
      </div>

      {/* Cards */}
      {filtered.length > 0 && (
        <section className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((v) => {
            // <- Dein gewünschtes Mapping (für’s Verständnis noch mal klar)
            const card = {
              id: v.id,
              title: v.title,
              date: new Date(v.publishedAt).toLocaleDateString("de-AT"),
              href: v.url,
              img: v.thumb,
            }

            return (
              <a
                key={card.id}
                href={card.href}
                target="_blank"
                rel="noreferrer"
                className="group rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition block"
              >
                <div className="aspect-video bg-white/5 overflow-hidden">
                  {card.img ? (
                    <img
                      src={card.img}
                      alt={card.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-white/40">Ohne Bild</div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold line-clamp-2">{card.title}</h3>
                  <div className="text-sm text-white/60 mt-1">{card.date}</div>
                </div>
              </a>
            )
          })}
        </section>
      )}

      {/* Mehr laden */}
      {nextPageToken && (
        <div className="text-center mt-10">
          <button
            disabled={loading}
            onClick={() => fetchVideos({ cursor: nextPageToken, replace: false })}
            className={cx(
              "px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10",
              loading && "opacity-60 cursor-not-allowed"
            )}
          >
            {loading ? "Laden …" : "Mehr laden"}
          </button>
        </div>
      )}

      {/* Debug-Ausgabe */}
      {debug && (
        <pre className="mt-10 whitespace-pre-wrap text-xs bg-black/50 rounded-xl p-4 border border-white/10 overflow-x-auto">
          {JSON.stringify({ count: videos.length, nextPageToken, steps: debugSteps }, null, 2)}
        </pre>
      )}
    </div>
  )
}