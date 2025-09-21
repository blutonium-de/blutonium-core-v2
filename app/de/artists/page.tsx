"use client"

import { useEffect, useState } from "react"

type Artist = {
  id: string
  name: string
  image?: string | null
  genres: string[]
  followersTotal: number
  spotifyUrl?: string | null
  appleUrl?: string
  beatportUrl?: string
}

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const base = typeof window === "undefined" ? "" : window.location.origin
    fetch(`${base}/api/artists`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        const j = await r.json()
        setArtists(j.artists ?? [])
      })
      .catch((e) => setError(e.message || "Fehler beim Laden"))
  }, [])

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-red-300">
        Fehler beim Laden: {error}
      </div>
    )
  }

  if (!artists) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="w-full aspect-square rounded-full bg-white/10" />
            <div className="h-4 w-2/3 mt-4 bg-white/10 rounded" />
            <div className="h-3 w-1/3 mt-2 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    )
  }

  // Sortierung: erst bestimmte Artists, dann nach Followern
  const normalized = [...artists].sort((A, B) => {
    const priority = ["Blutonium Boy", "Blutonium Boys", "Kris Grey"]
    const ai = priority.findIndex((n) => n.toLowerCase() === A.name.toLowerCase())
    const bi = priority.findIndex((n) => n.toLowerCase() === B.name.toLowerCase())
    if (ai !== -1 && bi === -1) return -1
    if (bi !== -1 && ai === -1) return 1
    if (ai !== -1 && bi !== -1) return ai - bi
    return (B.followersTotal ?? 0) - (A.followersTotal ?? 0)
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
          Artists &amp; Booking
        </h1>
        <p className="mt-3 text-white/70">
          Offizielle Blutonium Records Artists. Hör rein, folge ihnen und stelle deine Booking-Anfrage.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {normalized.map((a) => (
          <article key={a.id} className="card text-center p-4">
            {/* Avatar */}
            <div className="aspect-square w-40 mx-auto overflow-hidden rounded-full bg-white/10">
              {a.image ? (
                <img
                  src={a.image}
                  alt={a.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-white/40 text-sm">
                  Kein Bild
                </div>
              )}
            </div>

            {/* Name + Meta */}
            <h2 className="mt-4 text-lg font-semibold">{a.name}</h2>
            <p className="text-sm text-white/60">
              {(a.followersTotal ?? 0).toLocaleString()} Follower
            </p>
            {a.genres.length > 0 && (
              <p className="text-xs text-white/50">{a.genres.slice(0, 2).join(", ")}</p>
            )}

            {/* Links */}
            <div className="mt-3 flex flex-wrap gap-2 justify-center">
              {a.spotifyUrl && (
                <a
                  href={a.spotifyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-md text-sm bg-[#1DB954]/20 hover:bg-[#1DB954]/30 border border-white/10"
                >
                  Spotify
                </a>
              )}
              <a
                href={a.appleUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-md text-sm bg-white/10 hover:bg-white/20 border border-white/10"
              >
                Apple Music
              </a>
              <a
                href={a.beatportUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-md text-sm bg-white/10 hover:bg-white/20 border border-white/10"
              >
                Beatport
              </a>
            </div>

            {/* Booking */}
            <div className="mt-4">
              <a
                href={`/de/booking?artist=${encodeURIComponent(a.name)}`}
                className="btn w-full text-center"
              >
                Book now
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}