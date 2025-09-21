"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type AlbumType = "album" | "single" | "compilation"
type Release = {
  id: string
  year: number
  releaseDate: string
  title: string
  type: AlbumType
  label: string | null
  coverUrl: string | null
  artists: { id: string; name: string; url?: string }[]
  tracks: { id: string; title: string; isRadioEdit: boolean; previewUrl?: string | null; spotifyUrl: string }[]
  spotifyUrl: string
  appleUrl: string
  beatportUrl: string
  catalogNumber: string | null
  credits?: string[]
}

function kindFrom(r: Release): "Album" | "Compilation" | "Single" | "EP" {
  if (r.type === "album") return "Album"
  if (r.type === "compilation") return "Compilation"
  const n = r.tracks?.length ?? 0
  return n >= 4 ? "EP" : "Single"
}

const TABS = ["Alle", "Alben", "Compilations", "Singles", "EPs"] as const
type Tab = typeof TABS[number]

export default function ReleasesPage() {
  const [releases, setReleases] = useState<Release[]>([])
  const [tab, setTab] = useState<Tab>("Alle")
  const yearRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    fetch("/api/releases")
      .then((r) => r.json())
      .then((data) => setReleases(data.releases || []))
      .catch(() => setReleases([]))
  }, [])

  // Zähler je Kategorie
  const counts = useMemo(() => {
    let albums = 0, comps = 0, singles = 0, eps = 0
    for (const r of releases) {
      const k = kindFrom(r)
      if (k === "Album") albums++
      else if (k === "Compilation") comps++
      else if (k === "EP") eps++
      else singles++
    }
    return {
      Alle: releases.length,
      Alben: albums,
      Compilations: comps,
      Singles: singles,
      EPs: eps,
    }
  }, [releases])

  // Filter nach Tab
  const filtered = useMemo(() => {
    if (tab === "Alle") return releases
    return releases.filter((r) => {
      const k = kindFrom(r)
      if (tab === "Alben") return k === "Album"
      if (tab === "Compilations") return k === "Compilation"
      if (tab === "Singles") return k === "Single"
      if (tab === "EPs") return k === "EP"
      return true
    })
  }, [releases, tab])

  // Nach Jahr gruppieren
  const byYear = useMemo(() => {
    const map = new Map<number, Release[]>()
    for (const r of filtered) {
      const y = Number(r.year) || 0
      if (!map.has(y)) map.set(y, [])
      map.get(y)!.push(r)
    }
    for (const [y, list] of map) {
      list.sort((b, a) => (a.releaseDate || "").localeCompare(b.releaseDate || ""))
      map.set(y, list)
    }
    return [...map.entries()].sort((b, a) => a[0] - b[0]) // neueste Jahre zuerst
  }, [filtered])

  const years = useMemo(() => byYear.map(([y]) => y).filter(Boolean) as number[], [byYear])

  function scrollToYear(y: number) {
    const key = String(y)
    const node = yearRefs.current[key]
    if (!node) return
    // kleiner Offset für fixe Navbar
    const top = node.getBoundingClientRect().top + window.scrollY - 80
    window.scrollTo({ top, behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Titel */}
        <h1 className="text-3xl font-extrabold tracking-tight text-center mb-6">
          Blutonium Records Veröffentlichungen
        </h1>

        {/* Tabs mit Zählern */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-sm border flex items-center gap-2 ${
                tab === t
                  ? "bg-cyan-500 text-black border-cyan-400"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              <span>{t}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-black/40 border border-white/10">
                {(counts as any)[t] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Mobile: Jump-to-Year Dropdown */}
        {years.length > 0 && (
          <div className="md:hidden mb-6">
            <label className="block text-xs mb-1 opacity-70">Jump to Year</label>
            <select
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2"
              onChange={(e) => {
                const val = Number(e.target.value)
                if (val) scrollToYear(val)
              }}
              defaultValue=""
            >
              <option value="" disabled>Jahr auswählen…</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-8">
          {/* Desktop: Year Index (Sticky) */}
          {years.length > 0 && (
            <aside className="hidden md:block w-32 shrink-0">
              <div className="sticky top-24">
                <div className="text-xs mb-2 opacity-70">Jump to Year</div>
                <ul className="space-y-1">
                  {years.map((y) => (
                    <li key={y}>
                      <button
                        onClick={() => scrollToYear(y)}
                        className="w-full text-left px-2 py-1 rounded hover:bg-white/10 text-sm"
                      >
                        {y}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}

          {/* Inhalt */}
          <main className="flex-1">
            {byYear.length === 0 && (
              <p className="text-center opacity-70">Keine Releases gefunden.</p>
            )}

            <div className="space-y-10">
              {byYear.map(([year, list]) => (
                <section
                  key={year}
                  ref={(el) => (yearRefs.current[String(year)] = el)}
                  className="space-y-4"
                >
                  {/* Jahr-Header */}
                  <h2 className="text-2xl font-bold border-b border-white/10 pb-2">
                    {year || "Ohne Jahr"}
                  </h2>

                  {/* Release-Liste */}
                  <ul className="space-y-6">
                    {list.map((r) => {
                      const kind = kindFrom(r)
                      const artistNames = r.artists?.map((a) => a.name).join(", ")
                      return (
                        <li key={r.id} className="card p-4">
                          <div className="flex flex-col sm:flex-row gap-4">
                            {/* Cover links (250px am Desktop) */}
                            <div className="sm:w-[250px] sm:min-w-[250px] sm:max-w-[250px]">
                              {r.coverUrl ? (
                                <img
                                  src={r.coverUrl}
                                  alt={r.title}
                                  className="w-full h-full max-h-[250px] object-cover rounded"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-[250px] bg-white/5 rounded grid place-items-center text-sm opacity-70">
                                  Kein Cover
                                </div>
                              )}
                            </div>

                            {/* Text rechts */}
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-xs px-2 py-1 rounded bg-white/10 border border-white/10">
                                  {kind}
                                </span>
                                {r.label && (
                                  <span className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10">
                                    {r.label}
                                  </span>
                                )}
                                {r.catalogNumber && (
                                  <span className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10">
                                    {r.catalogNumber}
                                  </span>
                                )}
                                {r.releaseDate && (
                                  <span className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10">
                                    {r.releaseDate}
                                  </span>
                                )}
                              </div>

                              <h3 className="text-lg font-semibold">
                                {artistNames ? `${artistNames} — ${r.title}` : r.title}
                              </h3>

                              {/* Links */}
                              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                                <a className="link" href={r.spotifyUrl} target="_blank" rel="noreferrer">Spotify</a>
                                <a className="link" href={r.appleUrl} target="_blank" rel="noreferrer">Apple Music</a>
                                <a className="link" href={r.beatportUrl} target="_blank" rel="noreferrer">Beatport</a>
                              </div>

                              {/* Radio/Edits */}
                              {r.tracks?.some(t => t.isRadioEdit) && (
                                <div className="mt-3 text-xs opacity-80">
                                  Radio/Edits:{" "}
                                  {r.tracks.filter(t => t.isRadioEdit).map(t => t.title).join(", ")}
                                </div>
                              )}

                              {/* Credits */}
                              {!!r.credits?.length && (
                                <div className="mt-2 text-xs opacity-80">
                                  Credits: {r.credits.join(" · ")}
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
