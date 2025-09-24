// components/VideosClient.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type Vid = { id: string; title: string; thumb: string; publishedAt: string; url: string }
type SortKey = "newest" | "oldest"
const PAGE_SIZE = 18

export default function VideosClient() {
  const [videos, setVideos] = useState<Vid[]>([])
  const [nextToken, setNextToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [query, setQuery] = useState("")
  const [year, setYear] = useState<number | "all">("all")
  const [sort, setSort] = useState<SortKey>("newest")

  const loadedFirst = useRef(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const autoLoadEnabled = useRef(true) // wenn User auf Button klickt, bleibt es trotzdem aktiv

  async function fetchPage(token?: string | null) {
    const sp = new URLSearchParams()
    sp.set("max", String(PAGE_SIZE))
    if (token) sp.set("pageToken", token)
    try {
      setLoading(true); setErr(null)
      const r = await fetch(`/api/youtube?${sp.toString()}`, { cache: "no-store" })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || `API ${r.status}`)
      setVideos((prev) => [...prev, ...(j.videos || [])])
      setNextToken(j.nextPageToken || null)
    } catch (e: any) {
      setErr(e?.message || "Fehler beim Laden")
    } finally {
      setLoading(false)
    }
  }

  // Erstladung
  useEffect(() => {
    if (loadedFirst.current) return
    loadedFirst.current = true
    void fetchPage(null)
  }, [])

  // IntersectionObserver für Infinite Scroll
  useEffect(() => {
    if (!nextToken || !sentinelRef.current) return
    if (!("IntersectionObserver" in window)) return

    const io = new IntersectionObserver((entries) => {
      if (!autoLoadEnabled.current) return
      for (const e of entries) {
        if (e.isIntersecting && !loading) {
          void fetchPage(nextToken)
        }
      }
    }, { rootMargin: "600px 0px" }) // großzügig vorladen

    io.observe(sentinelRef.current)
    return () => io.disconnect()
  }, [nextToken, loading])

  const years = useMemo(() => {
    const ys = new Set<number>()
    for (const v of videos) {
      const y = new Date(v.publishedAt).getFullYear()
      if (!isNaN(y)) ys.add(y)
    }
    return Array.from(ys).sort((a, b) => b - a)
  }, [videos])

  const filtered = useMemo(() => {
    let src = videos
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      src = src.filter(v => v.title.toLowerCase().includes(q))
    }
    if (year !== "all") {
      src = src.filter(v => new Date(v.publishedAt).getFullYear() === year)
    }
    src = [...src].sort((a, b) => {
      const da = new Date(a.publishedAt).getTime()
      const db = new Date(b.publishedAt).getTime()
      return sort === "newest" ? db - da : da - db
    })
    return src
  }, [videos, query, year, sort])

  return (
    <div className="max-w-6xl mx-auto px-4 pb-16">
      <h1 className="pt-8 text-4xl md:text-5xl font-extrabold">Videos</h1>
      <p className="mt-3 text-white/80">Neueste Uploads vom offiziellen Blutonium Records YouTube-Kanal.</p>

      {/* Controls */}
      <div className="mt-6 flex flex-wrap gap-3 items-center">
        <button
          onClick={() => alert("Debug deaktiviert in Produktion 😉")}
          className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10"
        >
          Debug anzeigen
        </button>

        <input
          placeholder="Suche nach Titel..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="flex-1 min-w-[260px] px-4 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:border-white/20"
        />

        <select
          value={year}
          onChange={e => setYear(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10"
        >
          <option value="all">Alle Jahre</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortKey)}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10"
        >
          <option value="newest">Neu → Alt</option>
          <option value="oldest">Alt → Neu</option>
        </select>
      </div>

      {/* Grid */}
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(v => (
          <a
            key={v.id}
            href={v.url}
            target="_blank"
            rel="noreferrer"
            className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition overflow-hidden"
          >
            <div className="aspect-[16/9] w-full bg-white/10">
              <img src={v.thumb} alt={v.title} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="p-3">
              <div className="text-xs text-white/60">
                {new Date(v.publishedAt).toLocaleDateString("de-AT")}
              </div>
              <div className="mt-1 font-semibold line-clamp-2">{v.title}</div>
            </div>
          </a>
        ))}
      </div>

      {/* Status */}
      {err && <div className="mt-8 text-center text-red-300">Fehler: {err}</div>}
      {!loading && filtered.length === 0 && !err && (
        <div className="mt-8 text-center text-white/60">Keine aktuellen Videos gefunden.</div>
      )}

      {/* Fallback-Button (falls IO nicht feuert) */}
      {nextToken && (
        <div className="mt-8 text-center">
          <button
            disabled={loading}
            onClick={() => { autoLoadEnabled.current = true; void fetchPage(nextToken) }}
            className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50"
          >
            {loading ? "Laden …" : "Mehr laden"}
          </button>
        </div>
      )}

      {/* Sentinel für Infinite Scroll */}
      <div ref={sentinelRef} className="h-1" />
    </div>
  )
}