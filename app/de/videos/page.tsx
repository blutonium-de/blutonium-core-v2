"use client"

import { useEffect, useRef, useState } from "react"

type YTItem = {
  id?: { videoId?: string }
  snippet?: {
    title?: string
    publishedAt?: string
    thumbnails?: {
      high?: { url?: string }
      medium?: { url?: string }
      default?: { url?: string }
    }
  }
}

export default function VideosPage() {
  const [items, setItems] = useState<YTItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [initialLoaded, setInitialLoaded] = useState(false)

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const loadingMoreRef = useRef(false)

  async function fetchPage(token?: string | null) {
    try {
      setLoading(true)
      const base = typeof window === "undefined" ? "" : window.location.origin
      const params = new URLSearchParams()
      params.set("max", "12")
      if (token) params.set("pageToken", token)

      const r = await fetch(`${base}/api/youtube?${params.toString()}`, { cache: "no-store" })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || `${r.status} ${r.statusText}`)

      setItems(prev => [...prev, ...(j.videos || [])])
      setNextPageToken(j.nextPageToken || null)
      setError(null)
    } catch (e: any) {
      setError(e.message || "Fehler beim Laden")
    } finally {
      setLoading(false)
      loadingMoreRef.current = false
    }
  }

  // erste Seite
  useEffect(() => {
    if (initialLoaded) return
    setInitialLoaded(true)
    fetchPage(null)
  }, [initialLoaded])

  // IntersectionObserver für Infinite Scroll
  useEffect(() => {
    if (!sentinelRef.current) return

    const el = sentinelRef.current
    const io = new IntersectionObserver(
      entries => {
        const entry = entries[0]
        if (
          entry.isIntersecting &&
          !loadingMoreRef.current &&
          !loading &&
          nextPageToken // nur wenn es auch noch was gibt
        ) {
          loadingMoreRef.current = true
          fetchPage(nextPageToken)
        }
      },
      { rootMargin: "800px 0px 800px 0px", threshold: 0 } // frühzeitig nachladen
    )

    io.observe(el)
    return () => io.disconnect()
  }, [nextPageToken, loading])

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
          Videos
        </h1>
        <p className="mt-3 text-white/70">
          Neueste Uploads vom offiziellen Blutonium Records YouTube-Kanal.
        </p>
      </header>

      {/* Error */}
      {error && (
        <div className="py-6 text-center text-red-300">Fehler: {error}</div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Loading Skeleton beim initialen Laden */}
        {items.length === 0 && loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={`sk-${i}`} className="card animate-pulse">
              <div className="w-full rounded-xl bg-white/10" style={{ paddingTop: "56.25%" }} />
              <div className="h-4 w-3/4 mt-4 bg-white/10 rounded" />
              <div className="h-3 w-1/2 mt-2 bg-white/10 rounded" />
            </div>
          ))}

        {/* Videos */}
        {items.map((v, idx) => {
          const vid = v.id?.videoId
          const title = v.snippet?.title || "Ohne Titel"
          const date = v.snippet?.publishedAt
            ? new Date(v.snippet.publishedAt).toLocaleDateString("de-DE")
            : ""
          const thumb =
            v.snippet?.thumbnails?.high?.url ||
            v.snippet?.thumbnails?.medium?.url ||
            v.snippet?.thumbnails?.default?.url ||
            ""

          return (
            <article key={`${vid || idx}`} className="card overflow-hidden">
              <a
                href={vid ? `https://www.youtube.com/watch?v=${vid}` : "#"}
                target="_blank"
                rel="noreferrer"
                aria-label={title}
                className="block relative w-full"
                style={{ paddingTop: "56.25%" }}
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt={title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-white/40">
                    Kein Vorschaubild
                  </div>
                )}
              </a>

              <div className="p-4">
                <h2 className="text-base font-semibold line-clamp-2">{title}</h2>
                <p className="text-xs text-white/60 mt-1">{date}</p>
                {vid && (
                  <div className="mt-3">
                    <a
                      className="btn"
                      href={`https://www.youtube.com/watch?v=${vid}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Auf YouTube ansehen
                    </a>
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {/* Fallback „Mehr laden“-Button */}
      <div className="mt-8 text-center">
        {nextPageToken ? (
          <button
            className="btn"
            disabled={loading}
            onClick={() => fetchPage(nextPageToken)}
          >
            {loading ? "Lade …" : "Mehr laden"}
          </button>
        ) : items.length > 0 ? (
          <p className="text-white/50 text-sm">Keine weiteren Videos.</p>
        ) : null}
      </div>

      {/* Unsichtbarer Sentinel fürs Auto-Nachladen */}
      <div ref={sentinelRef} className="h-1" />
    </div>
  )
}