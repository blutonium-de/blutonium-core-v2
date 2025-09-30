// app/videos/page.tsx
"use client"

import { useEffect, useState } from "react"

type VideoItem = {
  id: string
  title: string
  thumb: string
  publishedAt: string
  url: string
}

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const r = await fetch("/api/youtube?max=12", { cache: "no-store" })
        const j = await r.json()
        if (!r.ok) throw new Error(j?.error || `YouTube API ${r.status}`)

        // Defensive: Nur Felder nehmen, die wir brauchen
        const list: VideoItem[] = Array.isArray(j?.videos)
          ? j.videos
              .map((v: any) => ({
                id: String(v?.id ?? ""),
                title: String(v?.title ?? ""),
                thumb: String(v?.thumb ?? ""),
                publishedAt: String(v?.publishedAt ?? ""),
                url: String(v?.url ?? ""),
              }))
              .filter((v) => v.id && v.thumb && v.url)
          : []

        if (alive) setVideos(list)
      } catch (e: any) {
        if (alive) setError(e?.message || "Konnte Videos nicht laden")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
          Videos
        </h1>
        <p className="mt-4 text-white/70">Lade YouTube-Videos …</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
          Videos
        </h1>
        <p className="mt-4 text-red-300">Fehler: {error}</p>
      </div>
    )
  }

  if (!videos.length) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
          Videos
        </h1>
        <p className="mt-4 text-white/70">Keine Videos gefunden.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
          Videos
        </h1>
        <p className="mt-3 text-white/80">
          Neueste Uploads von unserem YouTube-Kanal.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <a
            key={v.id}
            href={v.url}
            target="_blank"
            rel="noreferrer"
            className="group rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition"
          >
            {/* Thumbnail */}
            <div className="aspect-video overflow-hidden bg-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={v.thumb}
                alt={v.title}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                loading="lazy"
              />
            </div>

            {/* Text */}
            <div className="p-4">
              <h3 className="font-semibold line-clamp-2">{v.title}</h3>
              <p className="mt-2 text-sm text-white/60">
                {new Date(v.publishedAt).toLocaleDateString("de-AT", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                })}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}