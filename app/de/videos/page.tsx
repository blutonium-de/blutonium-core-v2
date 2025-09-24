// app/de/videos/page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"

type ApiVideo = {
  id: string
  title: string
  thumb: string
  publishedAt: string
  url: string
}

type ApiResp = {
  videos: ApiVideo[]
  nextPageToken?: string | null
  source?: string
  error?: string
}

function cls(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(" ")
}

export default function VideosPage() {
  const [videos, setVideos] = useState<ApiVideo[]>([])
  const [nextPage, setNextPage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debug, setDebug] = useState<ApiResp | null>(null)

  // UI-Filter
  const [q, setQ] = useState("")
  const [year, setYear] = useState<string>("all")
  const [sort, setSort] = useState<"new" | "old">("new")

  async function fetchVideos(cursor?: string | null) {
    setLoading(true)
    setError(null)
    try {
      const sp = new URLSearchParams()
      sp.set("max", "12")
      if (cursor) sp.set("pageToken", cursor)
      const r = await fetch(`/api/youtube?${sp.toString()}`, { cache: "no-store" })
      const data: ApiResp = await r.json()
      setDebug(data)
      if (!r.ok) throw new Error(data?.error || `API ${r.status}`)
      setVideos(v => (cursor ? [...v, ...data.videos] : data.videos))
      setNextPage(data.nextPageToken || null)
    } catch (e: any) {
      setError(e?.message || "Fehler beim Laden")
      setVideos([]) // leer anzeigen
      setNextPage(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVideos(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    let arr = [...videos]
    // Suche
    if (q.trim()) {
      const qq = q.toLowerCase()
      arr = arr.filter(v => v.title.toLowerCase().includes(qq))
    }
    // Jahr
    if (year !== "all") {
      arr = arr.filter(v => (v.publishedAt || "").startsWith(year))
    }
    // Sortierung
    arr.sort((a, b) =>
      sort === "new"
        ? (b.publishedAt || "").localeCompare(a.publishedAt || "")
        : (a.publishedAt || "").localeCompare(b.publishedAt || "")
    )
    return arr
  }, [videos, q, year, sort])

  // Jahre aus den Videos bilden
  const years = useMemo(() => {
    const set = new Set<string>()
    for (const v of videos) {
      const y = (v.publishedAt || "").slice(0, 4)
      if (y) set.add(y)
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [videos])

  return (
    <div className="max-w-6xl mx-auto px-4 pb-16">
      <header className="pt-10 pb-6">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Videos</h1>
        <p className="mt-3 text-white/80">
          Neueste Uploads vom offiziellen Blutonium Records YouTube-Kanal.
        </p>

        <div className="mt-6 flex flex-wrap gap-3 items-center">
          <button
            onClick={() => setDebug(d => (d ? null : debug))}
            className="px-4 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10"
          >
            Debug anzeigen
          </button>

          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Suche nach Titel..."
            className="flex-1 min-w-[240px] px-4 py-2 rounded-lg border border-white/15 bg-white/5 outline-none"
          />

          <select
            value={year}
            onChange={e => setYear(e.target.value)}
            className="px-3 py-2 rounded-lg border border-white/15 bg-white/5"
          >
            <option value="all">Alle Jahre</option>
            {years.map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={e => setSort(e.target.value as any)}
            className="px-3 py-2 rounded-lg border border-white/15 bg-white/5"
          >
            <option value="new">Neu → Alt</option>
            <option value="old">Alt → Neu</option>
          </select>
        </div>
      </header>

      {/* Lade-/Fehlerzustand */}
      {loading && !videos.length && (
        <div className="py-20 text-center text-white/70">Lade Videos …</div>
      )}

      {error && !videos.length && (
        <div className="py-8 text-center text-rose-300">
          Fehler: {error || "Unbekannt"}
        </div>
      )}

      {/* Cards */}
      {filtered.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(v => {
            const date = v.publishedAt
              ? new Date(v.publishedAt).toLocaleDateString("de-AT")
              : ""
            return (
              <a
                key={v.id}
                href={v.url}
                target="_blank"
                rel="noreferrer"
                className="group rounded-2xl border border-white/10 bg-white/5 overflow-hidden hover:bg-white/10 transition"
              >
                <div className="aspect-video bg-white/10 overflow-hidden">
                  <img
                    src={v.thumb}
                    alt={v.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <div className="text-sm text-white/60">{date}</div>
                  <div className="mt-1 font-semibold leading-snug line-clamp-2">
                    {v.title}
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      ) : (
        !loading &&
        !error && (
          <div className="py-16 text-center text-white/70">
            Keine aktuellen Videos gefunden.
          </div>
        )
      )}

      {/* “Mehr laden” für nächste Seite – nur aktiv, wenn API eine nextPageToken hat */}
      {nextPage && (
        <div className="text-center mt-10">
          <button
            disabled={loading}
            onClick={() => fetchVideos(nextPage)}
            className={cls(
              "px-5 py-2 rounded-lg border border-white/15",
              "bg-white/5 hover:bg-white/10 disabled:opacity-50"
            )}
          >
            {loading ? "Lädt …" : "Mehr laden"}
          </button>
        </div>
      )}

      {/* Debug-Ausgabe */}
      {debug && (
        <pre className="mt-10 text-xs whitespace-pre-wrap rounded-xl border border-white/10 bg-black/60 p-4 overflow-auto">
{JSON.stringify(debug, null, 2)}
        </pre>
      )}
    </div>
  )
}