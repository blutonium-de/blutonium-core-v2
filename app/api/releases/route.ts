// app/api/releases/route.ts
import { NextResponse } from "next/server"
import { getSpotifyToken, ARTISTS } from "../../../lib/spotify"
import demo from "../../../data/demo-releases.json" assert { type: "json" }

export const dynamic = "force-dynamic"

const LABEL_NAME = "Blutonium Records"

type Artist = { id: string; name: string; url?: string }
type Release = {
  id: string
  year: number
  releaseDate: string | null
  title: string
  type: "album" | "single" | "compilation"
  label: string | null
  coverUrl: string | null
  artists: Artist[]
  tracks: []
  spotifyUrl: string
  appleUrl: string
  beatportUrl: string
  catalogNumber: string | null
  credits: string[]
}

function ok(data: any, extraHeaders?: Record<string, string>) {
  return new NextResponse(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", ...(extraHeaders || {}) },
  })
}

function toBaseItem(a: any): Release {
  const year = Number((a.release_date || "").slice(0, 4))
  const mainArtist = a.artists?.[0]?.name ?? ""
  const q = encodeURIComponent(`${mainArtist} ${a.name}`)
  return {
    id: a.id,
    year,
    releaseDate: a.release_date || null,
    title: a.name,
    type: (a.album_type as "album" | "single" | "compilation") || "single",
    label: a.label || null,
    coverUrl: a.images?.[0]?.url || null,
    artists: (a.artists || []).map((ar: any) => ({
      id: ar.id,
      name: ar.name,
      url: ar.external_urls?.spotify,
    })),
    tracks: [],
    spotifyUrl: `https://open.spotify.com/album/${a.id}`,
    appleUrl: `https://music.apple.com/de/search?term=${q}`,
    beatportUrl: `https://www.beatport.com/search?q=${q}`,
    catalogNumber: null,
    credits: [],
  }
}

async function searchAlbums({
  token,
  qParts,
  limit,
  pages,
  offsetStart,
}: {
  token: string
  qParts: string[]
  limit: number
  pages: number
  offsetStart?: number
}) {
  const headers = { Authorization: `Bearer ${token}` }
  const results: any[] = []
  let offset = offsetStart ?? 0

  for (let i = 0; i < pages; i++) {
    const q = encodeURIComponent(qParts.join(" "))
    const url = `https://api.spotify.com/v1/search?type=album&market=DE&limit=${limit}&offset=${offset}&q=${q}`
    const r = await fetch(url, { headers, cache: "no-store" })
    if (r.status === 429) break
    if (!r.ok) break
    const data = await r.json()
    const items = data?.albums?.items || []
    results.push(...items)
    if (items.length < limit) {
      offset += items.length
      return { items: results, cursorNext: null as string | null }
    }
    offset += limit
  }
  const cursorNext = results.length >= limit * pages ? String(offset) : null
  return { items: results, cursorNext }
}

async function fetchArtistYearAlbums({
  token,
  artistId,
  year,
  limit = 50,
  maxPages = 3,
}: {
  token: string
  artistId: string
  year: number
  limit?: number
  maxPages?: number
}) {
  const headers = { Authorization: `Bearer ${token}` }
  const results: any[] = []
  let offset = 0
  for (let i = 0; i < maxPages; i++) {
    const url = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,compilation&market=DE&limit=${limit}&offset=${offset}`
    const r = await fetch(url, { headers, cache: "no-store" })
    if (r.status === 429) break
    if (!r.ok) break
    const data = await r.json()
    const items = (data?.items || []).filter((x: any) =>
      (x.release_date || "").startsWith(String(year))
    )
    results.push(...items)
    if ((data?.items || []).length < limit) break
    offset += limit
  }
  return results
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get("limit") || "50"), 50)
    const pages = Math.min(Number(searchParams.get("pages") || "1"), 10)
    const cursorParam = searchParams.get("cursor")
    const offsetStart = cursorParam ? Number(cursorParam) || 0 : 0

    const yearParam = searchParams.get("year")
    const year = yearParam ? Number(yearParam) : undefined
    const typeParam = searchParams.get("type") as "album" | "single" | "compilation" | null

    // Token
    let token = ""
    try {
      token = await getSpotifyToken()
    } catch {
      const demoSorted = [...(demo as Release[])].sort((b, a) =>
        (a.releaseDate || "").localeCompare(b.releaseDate || "")
      )
      return ok({ releases: demoSorted, cursorNext: null, source: "demo-token" })
    }

    // === GLOBAL (kein Jahr) → nur Label-Suche, paging ===
    if (!year) {
      const { items, cursorNext } = await searchAlbums({
        token,
        qParts: [`label:"${LABEL_NAME}"`],
        limit,
        pages,
        offsetStart,
      })
      if (!items.length) {
        const demoSorted = [...(demo as Release[])].sort((b, a) =>
          (a.releaseDate || "").localeCompare(b.releaseDate || "")
        )
        return ok({ releases: demoSorted, cursorNext: null, source: "demo-empty" })
      }
      let releases = items.map(toBaseItem)
      if (typeParam) releases = releases.filter((r) => r.type === typeParam)
      releases.sort((b, a) => (a.releaseDate || "").localeCompare(b.releaseDate || ""))
      return ok({ releases, cursorNext, source: "spotify-global" })
    }

    // === JAHR-SPEZIFISCH: Label-Suche + Artist-Feeds, dann mergen ===
    const [labelRes, artistBatches] = await Promise.all([
      searchAlbums({
        token,
        qParts: [`label:"${LABEL_NAME}"`, `year:${year}`],
        limit,
        pages,
        offsetStart,
      }),
      // Artists parallel holen (gefiltert auf das Jahr)
      Promise.all(
        (ARTISTS || []).map((aid) => fetchArtistYearAlbums({ token, artistId: aid, year, limit: 50, maxPages: 3 }))
      ),
    ])

    const fromLabel = labelRes.items
    const fromArtists = artistBatches.flat()

    // Falls Label leer war, helfen die Artist-Feeds → trotzdem alles nehmen
    const mergedMap = new Map<string, any>()
    for (const it of [...fromLabel, ...fromArtists]) {
      // Bevorzugt Releases, die klar als Blutonium gelabelt sind
      const existing = mergedMap.get(it.id)
      if (!existing) {
        mergedMap.set(it.id, it)
      } else {
        const existingIsBlutonium = (existing.label || "").toLowerCase().includes("blutonium")
        const incomingIsBlutonium = (it.label || "").toLowerCase().includes("blutonium")
        if (!existingIsBlutonium && incomingIsBlutonium) mergedMap.set(it.id, it)
      }
    }

    let releases = Array.from(mergedMap.values()).map(toBaseItem)
    releases = releases.filter((r) => r.year === year) // doppelt absichern
    if (typeParam) releases = releases.filter((r) => r.type === typeParam)
    releases.sort((b, a) => (a.releaseDate || "").localeCompare(b.releaseDate || ""))

    // Cursor nur aus der Label-Suche weitergeben (Artists sind „voll“ fürs Jahr)
    const cursorNext = labelRes.cursorNext

    // Fallback Demo falls trotzdem leer
    if (!releases.length) {
      const demoSorted = [...(demo as Release[])].sort((b, a) =>
        (a.releaseDate || "").localeCompare(b.releaseDate || "")
      )
      return ok({ releases: demoSorted, cursorNext: null, source: "demo-year-empty" })
    }

    return ok({ releases, cursorNext, source: "spotify-year-merged" })
  } catch (err: any) {
    const demoSorted = [...(demo as Release[])].sort((b, a) =>
      (a.releaseDate || "").localeCompare(b.releaseDate || "")
    )
    return ok({ releases: demoSorted, cursorNext: null, error: err?.message ?? "unknown", source: "demo-catch" })
  }
}