'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type Artist = { id?: string; name: string; url?: string }
type Track = { id?: string; title: string; previewUrl?: string; spotifyUrl?: string; isRadioEdit?: boolean }
type Release = {
  id: string
  year: number
  releaseDate?: string
  title: string
  type: 'single' | 'album' | 'compilation' | 'ep'
  label?: string | null
  coverUrl?: string | null
  artists?: Artist[]
  tracks?: Track[]
  spotifyUrl?: string
  appleUrl?: string
  beatportUrl?: string
  catalogNumber?: string | null
  credits?: string[]
}

const TABS = [
  { key: 'all', label: 'Alle' },
  { key: 'single', label: 'Singles' },
  { key: 'ep', label: "EP's" },
  { key: 'album', label: 'Alben' },
  { key: 'compilation', label: 'Compilations' },
] as const
type TabKey = typeof TABS[number]['key']

// EP-Heuristik (Spotify markiert EPs oft als "single")
function isEp(r: Release) {
  const n = r.tracks?.length ?? 0
  return r.type === 'ep' || (r.type === 'single' && n >= 3)
}

export default function ReleasesPage() {
  const [tab, setTab] = useState<TabKey>('all')
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  const [releases, setReleases] = useState<Release[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // Pagination (client-seitig)
  const PAGE_SIZE = 12
  const [showCount, setShowCount] = useState(PAGE_SIZE)

  // Debounce Suche
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().toLowerCase()), 250)
    return () => clearTimeout(t)
  }, [query])

  // Laden
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true); setErr(null)
        // sanfter API-Call (Demo/NoDetails) – später auf /api/releases umstellbar
        const res = await fetch('/api/releases?devLimit=12&noDetails=1', { cache: 'no-store' })
        const data = await res.json()
        if (!cancelled) setReleases(Array.isArray(data.releases) ? data.releases as Release[] : [])
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Fehler beim Laden')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Filter nach Tab & Suche
  const filtered = useMemo(() => {
    if (!releases) return []
    const base = releases.filter(r => {
      // Tab
      if (tab !== 'all') {
        if (tab === 'ep') {
          if (!isEp(r)) return false
        } else if (r.type !== tab) {
          return false
        }
      }
      // Suche
      if (!debounced) return true
      const hay = [
        r.title,
        r.label || '',
        ...(r.artists?.map(a => a.name) || []),
        r.catalogNumber || '',
      ].join(' ').toLowerCase()
      return hay.includes(debounced)
    })
    // Neueste zuerst
    base.sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''))
    return base
  }, [releases, tab, debounced])

  // Nach Jahr gruppieren
  const byYear = useMemo(() => {
    const m = new Map<number, Release[]>()
    for (const r of filtered) {
      const y = r.year || 0
      const arr = m.get(y) || []
      arr.push(r)
      m.set(y, arr)
    }
    // Jedes Jahr intern wieder sortieren
    for (const [y, arr] of m) {
      arr.sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''))
      m.set(y, arr)
    }
    return [...m.entries()].sort((a, b) => b[0] - a[0])
  }, [filtered])

  const years = useMemo(() => byYear.map(([y]) => y), [byYear])

  // Sichtbare Anzahl (Pagination) – auf Jahr verteilt zählen
  const visibleByYear = useMemo(() => {
    let left = showCount
    const out: Array<[number, Release[]]> = []
    for (const [year, arr] of byYear) {
      if (left <= 0) break
      const take = Math.min(left, arr.length)
      out.push([year, arr.slice(0, take)])
      left -= take
    }
    return out
  }, [byYear, showCount])

  // Jahresanker + Year Rail highlight
  const yearRefs = useRef(new Map<number, HTMLElement>())
  const [activeYear, setActiveYear] = useState<number | null>(null)
  useEffect(() => {
    const io = new IntersectionObserver(
      entries => {
        const visible: Array<{year: number; top: number}> = []
        for (const e of entries) {
          if (e.isIntersecting) {
            const y = Number((e.target as HTMLElement).dataset.year)
            const rect = (e.target as HTMLElement).getBoundingClientRect()
            visible.push({ year: y, top: rect.top })
          }
        }
        if (visible.length) {
          visible.sort((a, b) => Math.abs(a.top) - Math.abs(b.top))
          setActiveYear(visible[0].year)
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] }
    )
    const nodes: HTMLElement[] = []
    yearRefs.current.forEach((el) => { if (el) { io.observe(el); nodes.push(el) } })
    return () => { nodes.forEach(n => io.unobserve(n)); io.disconnect() }
  }, [visibleByYear.length]) // neu verbinden, wenn Blöcke wechseln

  function scrollToYear(y: number) {
    const el = yearRefs.current.get(y)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="text-white relative">
      {/* Header */}
      <header className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Blutonium Records Veröffentlichungen
        </h1>
        <p className="mt-2 opacity-80 text-sm">
          Katalog nach Jahren & Typ gefiltert. Cover, Credits & Direktlinks zu Spotify, Apple & Beatport.
        </p>
      </header>

      {/* Sticky Filterleiste */}
      <div className="sticky top-16 z-30 bg-black/70 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setShowCount(PAGE_SIZE) }}
                className={`px-3 py-1.5 rounded-md text-sm transition
                  ${tab === t.key ? 'bg-cyan-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Suche */}
          <div className="lg:ml-auto flex items-center gap-2">
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setShowCount(PAGE_SIZE) }}
              placeholder="Suchen: Titel / Artist / Label / Cat#"
              className="w-[240px] sm:w-[300px] bg-white/10 border border-white/15 rounded px-3 py-1.5 text-sm outline-none focus:border-cyan-400"
            />
            {/* Jahreswahl (Dropdown) */}
            <select
              className="bg-white/10 border border-white/15 rounded px-2 py-1.5 text-sm"
              onChange={(e) => {
                const y = Number(e.target.value)
                if (y) scrollToYear(y)
              }}
              defaultValue=""
            >
              <option value="" disabled>Jahr wählen…</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Status */}
      {loading && <div className="py-16 opacity-80">Lade Releases…</div>}
      {err && <div className="py-6 text-red-400">Fehler: {err}</div>}
      {!loading && !err && releases && releases.length === 0 && (
        <div className="py-6 opacity-80">Noch keine Daten – später Spotify-Keys auf Vercel aktivieren.</div>
      )}

      {/* Inhalt + Year Rail */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="relative">
          {/* Year Rail (Desktop) */}
          {years.length > 0 && (
            <aside className="hidden xl:block fixed right-6 top-[140px] z-20">
              <div className="flex flex-col items-end gap-1">
                {years.map(y => (
                  <button
                    key={y}
                    onClick={() => scrollToYear(y)}
                    className={`text-sm px-2 py-1 rounded transition ${
                      activeYear === y ? 'bg-cyan-600 text-white' : 'bg-white/10 hover:bg-white/20'
                    }`}
                    title={`Springe zu ${y}`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </aside>
          )}

          {/* Jahresblöcke (paginiert sichtbar) */}
          <div className="flex flex-col gap-10">
            {visibleByYear.map(([year, list]) => (
              <section
                key={year}
                ref={el => { if (el) yearRefs.current.set(year, el as HTMLElement) }}

                data-year={year}
                className="scroll-mt-24"
              >
                <h2 className="text-xl font-bold mb-4 opacity-90">{year}</h2>
                <div className="flex flex-col gap-5">
                  {list.map(r => (
                    <article key={r.id} className="rounded-lg border border-white/10 bg-white/5 p-4 md:p-5">
                      <div className="flex flex-col md:flex-row md:items-start gap-4">
                        {/* Cover */}
                        <div className="flex-shrink-0 mx-auto md:mx-0">
                          <img
                            src={r.coverUrl || '/placeholder-cover.png'}
                            alt={r.title}
                            className="rounded-md shadow md:w-[250px] md:h-[250px] w-40 h-40 object-cover object-center"
                            loading="lazy"
                          />
                        </div>

                        {/* Infos */}
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-block text-xs uppercase tracking-wide px-2 py-0.5 rounded bg-white/10">
                              {r.type === 'single' && isEp(r) ? 'EP' : (r.type === 'ep' ? 'EP' : r.type)}
                            </span>
                            {r.catalogNumber && (
                              <span className="inline-block text-xs px-2 py-0.5 rounded bg-white/10">Cat#: {r.catalogNumber}</span>
                            )}
                            {r.label && (
                              <span className="inline-block text-xs px-2 py-0.5 rounded bg-white/10">{r.label}</span>
                            )}
                            {r.releaseDate && (
                              <span className="inline-block text-xs px-2 py-0.5 rounded bg-white/10">{r.releaseDate}</span>
                            )}
                          </div>

                          <h3 className="mt-2 text-lg sm:text-xl font-semibold">{r.title}</h3>

                          {/* Artists */}
                          {r.artists?.length ? (
                            <div className="mt-1 text-sm opacity-90">
                              {r.artists.map((a, i) => (
                                <span key={a.id || a.name}>
                                  {a.url
                                    ? <a href={a.url} target="_blank" rel="noreferrer" className="underline hover:no-underline">{a.name}</a>
                                    : a.name}
                                  {i < (r.artists!.length - 1) ? ', ' : ''}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          {/* Links */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {r.spotifyUrl && <a className="btn" href={r.spotifyUrl} target="_blank" rel="noreferrer">Spotify</a>}
                            {r.appleUrl && <a className="btn" href={r.appleUrl} target="_blank" rel="noreferrer">Apple Music</a>}
                            {r.beatportUrl && <a className="btn" href={r.beatportUrl} target="_blank" rel="noreferrer">Beatport</a>}
                          </div>

                          {/* Tracks */}
                          {r.tracks?.length ? (
                            <div className="mt-4">
                              <h4 className="text-sm font-semibold opacity-90 mb-2">Tracks</h4>
                              <ul className="space-y-1 text-sm opacity-90">
                                {r.tracks.map(t => (
                                  <li key={t.id || t.title} className="flex items-center gap-2">
                                    <span>{t.title}</span>
                                    {t.spotifyUrl && (
                                      <a href={t.spotifyUrl} target="_blank" rel="noreferrer" className="underline hover:no-underline">▶︎</a>
                                    )}
                                    {t.previewUrl && <audio className="h-6" controls src={t.previewUrl} preload="none" />}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {/* Credits */}
                          {r.credits?.length ? (
                            <div className="mt-3 text-xs opacity-80">
                              <span className="font-semibold">Credits: </span>
                              {r.credits.join(' · ')}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Mehr laden */}
          {!loading && !err && filtered.length > showCount && (
            <div className="mt-8 flex justify-center">
              <button
                className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/15"
                onClick={() => setShowCount(c => c + PAGE_SIZE)}
              >
                Mehr laden
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
