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
  | {
      videos: Video[]
      nextPageToken: string | null
      source: string
      steps?: any[]
      note?: string
    }
  | {
      error: string
      videos?: Video[]
      source?: string
      steps?: any[]
      note?: string
    }

function cx(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(" ")
}

async function fetchVideos(params: Record<string, string | number>) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => sp.set(k, String(v)))
  const base = typeof window === "undefined" ? "" : window.location.origin
  const r = await fetch(`${base}/api/youtube?${sp.toString()}`, { cache: "no-store" })
  const json = (await r.json()) as ApiResponse
  if (!r.ok) throw json
  return json
}

export default function VideosPage() {
  // Daten & API-State
  const [items, setItems] = useState<Video[]>([])
  const [nextToken, setNextToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResp, setLastResp] = useState<any>(null)

  // UI: Suche / Filter / Sortierung
  const [q, setQ] = useState("")           // Such-Query
  const [year, setYear] = useState<string>("all")
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc") // desc = neu → alt
  const [debugOpen, setDebugOpen] = useState(false)

  // Initial-Ladung
  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetchVideos({ max: 12 })
        setItems(res.videos || [])
        setNextToken((res as any).nextPageToken ?? null)
        setLastResp(res)
      } catch (e: any) {
        setError(e?.error || e?.note || "Fehler beim Laden")
        setItems([])
        setNextToken(null)
        setLastResp(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Alle verfügbaren Jahre aus geladenen Items (für Dropdown)
  const allYears = useMemo(() => {
    const ys = new Set<number>()
    for (const v of items) {
      const d = new Date(v.publishedAt)
      if (!isNaN(d.getTime())) ys.add(d.getFullYear())
    }
    return Array.from(ys).sort((a, b) => b - a)
  }, [items])

  // Gefilterte & sortierte Liste (clientseitig)
  const filtered = useMemo(() => {
    let list = items

    // Jahr-Filter
    if (year !== "all") {
      const y = Number(year)
      list = list.filter((v) => {
        const d = new Date(v.publishedAt)
        return !isNaN(d.getTime()) && d.getFullYear() === y
      })
    }

    // Suche (Titel)
    const qq = q.trim().toLowerCase()
    if (qq) {
      list = list.filter((v) => v.title?.toLowerCase().includes(qq))
    }

    // Sortierung
    list = [...list].sort((a, b) => {
      const ta = new Date(a.publishedAt).getTime()
      const tb = new Date(b.publishedAt).getTime()
      return sortDir === "desc" ? tb - ta : ta - tb
    })

    return list
  }, [items, year, q, sortDir])

  return (
    <div className="max-w-6xl mx-auto">
      <header className="pt-10 pb-6">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Videos</h1>
        <p className="mt-3 text-white/80">
          Neueste Uploads vom offiziellen Blutonium Records YouTube-Kanal.
        </p>

        {/* Debug-Toggle */}
        {lastResp && (
          <button
            className="mt-4 text-xs px-3 py-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/10"
            onClick={() => setDebugOpen((s) => !s)}
          >
            {debugOpen ? "Debug schließen" : "Debug anzeigen"}
          </button>
        )}
        {debugOpen && lastResp && (
          <pre className="mt-3 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] leading-tight">
            {JSON.stringify(lastResp, null, 2)}
          </pre>
        )}
      </header>

      {/* Filterleiste */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center">
        {/* Suche */}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Suche nach Titel…"
          className="w-full sm:max-w-xs rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/20"
        />

        {/* Jahr */}
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="w-full sm:w-auto rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/20"
        >
          <option value="all">Alle Jahre</option>
          {allYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
          className="w-full sm:w-auto rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/20"
        >
          <option value="desc">Neu → Alt</option>
          <option value="asc">Alt → Neu</option>
        </select>
      </div>

      {/* Lade-/Fehlerzustände */}
      {loading && items.length === 0 && (
        <div className="py-16 text-center text-white/70">Lade Videos …</div>
      )}

      {error && items.length === 0 && (
        <div className="py-16 text-center text-red-300">
          Fehler: {error}
          {lastResp?.note ? <div className="text-white/60 mt-2">{lastResp.note}</div> : null}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && items.length > 0 && (
        <div className="py-16 text-center text-white/70">Keine Treffer für die Filter.</div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="py-16 text-center text-white/70">Keine Videos gefunden.</div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="pb-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((v) => (
              <a
                key={v.id}
                href={v.url}
                target="_blank"
                rel="noreferrer"
                className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
              >
                <div className="aspect-[16/9] overflow-hidden bg-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.thumb}
                    alt={v.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 text-base sm:text-lg font-semibold">{v.title}</h3>
                  <p className="mt-1 text-xs text-white/60">
                    {new Date(v.publishedAt || "").toLocaleDateString("de-AT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </a>
            ))}
          </div>

          {/* Mehr laden (nur wenn es noch mehr gibt) */}
          <div className="mt-8 text-center">
            {nextToken ? (
              <button
                disabled={loading}
                onClick={async () => {
                  try {
                    setLoading(true)
                    const res = await fetchVideos({ max: 12, pageToken: nextToken })
                    setItems((cur) => [...cur, ...(res.videos || [])])
                    setNextToken((res as any).nextPageToken ?? null)
                    setLastResp(res)
                  } catch (e: any) {
                    setError(e?.error || e?.note || "Fehler beim Nachladen")
                    setLastResp(e)
                  } finally {
                    setLoading(false)
                  }
                }}
                className={cx(
                  "px-4 py-2 rounded-lg border bg-white/5 hover:bg-white/10",
                  "border-white/10 disabled:opacity-50"
                )}
              >
                {loading ? "Laden …" : "Mehr laden"}
              </button>
            ) : (
              <div className="text-white/50 text-sm">Alles geladen.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}