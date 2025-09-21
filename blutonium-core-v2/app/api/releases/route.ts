// app/api/releases/route.ts
import { NextResponse } from "next/server"
// Verwende RELATIVE Imports, damit es unabhängig von tsconfig-Pfaden klappt:
import { getSpotifyToken } from "../../../lib/spotify"
import demo from "../../../data/demo-releases.json" assert { type: "json" }

export const dynamic = "force-dynamic"

const LABEL_NAME = "Blutonium Records"
const RADIO_RE = /(radio|short|edit|single edit|video edit|cut|mix)/i

type Release = {
  id: string
  year: number
  releaseDate: string | null
  title: string
  type: "album" | "single" | "compilation"
  label: string | null
  coverUrl: string | null
  artists: { id: string; name: string; url?: string }[]
  tracks: { id: string; title: string; previewUrl?: string | null; spotifyUrl: string }[]
  spotifyUrl: string
  appleUrl: string
  beatportUrl: string
  catalogNumber: string | null
  credits: string[]
}

let CACHE: { data: Release[]; exp: number } | null = null

function ok(data: any, extraHeaders?: Record<string, string>) {
  return new NextResponse(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", ...(extraHeaders || {}) },
  })
}

function toBaseItem(a: any): Release {
  const year = Number((a.release_date || "").slice(0, 4))
  const mainArtist = a.artists?.[0]?.name ?? ""
  const searchTerm = encodeURIComponent(`${mainArtist} ${a.name}`)
  return {
    id: a.id,
    year,
    releaseDate: a.release_date || null,
    title: a.name,
    type: (a.album_type as "album" | "single" | "compilation") || "single",
    label: a.label || "Blutonium Records",
    coverUrl: a.images?.[0]?.url || null,
    artists: (a.artists || []).map((ar: any) => ({
      id: ar.id,
      name: ar.name,
      url: ar.external_urls?.spotify,
    })),
    tracks: [], // bei noDetails=1 lassen wir die Trackliste leer, spart Calls
    spotifyUrl: `https://open.spotify.com/album/${a.id}`,
    appleUrl: `https://music.apple.com/de/search?term=${searchTerm}`,
    beatportUrl: `https://www.beatport.com/search?q=${searchTerm}`,
    catalogNumber: null,
    credits: [],
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const useMock = searchParams.get("source") === "mock"
    const noDetails = searchParams.get("noDetails") === "1"
    const devLimit = Number(searchParams.get("devLimit") || "0") || 0

    // 0) Mock/Fallback erzwingen
    if (useMock) {
      const demoSorted = [...(demo as Release[])].sort((b, a) =>
        (a.releaseDate || "").localeCompare(b.releaseDate || "")
      )
      return ok({ releases: demoSorted }, { "x-fallback": "demo" })
    }

    // 1) Cache prüfen
    if (CACHE && Date.now() < CACHE.exp) {
      return ok({ releases: CACHE.data }, { "x-cache": "hit" })
    }

    // 2) Token
    const token = await getSpotifyToken()
    const headers = { Authorization: `Bearer ${token}` }

    // 3) Nur Label-Suche (minimiert Requests)
    //    Wir holen nur die erste(n) Seite(n) und ggf. trimmen per devLimit.
    const q = encodeURIComponent(`label:"${LABEL_NAME}"`)
    const limit = Math.min(devLimit || 50, 50)
    const url = `https://api.spotify.com/v1/search?type=album&market=DE&limit=${limit}&offset=0&q=${q}`

    const r = await fetch(url, { headers, cache: "no-store" })
    if (r.status === 429) {
      // Rate-Limit → Fallback Demo (oder leer)
      const demoSorted = [...(demo as Release[])].sort((b, a) =>
        (a.releaseDate || "").localeCompare(b.releaseDate || "")
      )
      return ok({ releases: demoSorted }, { "x-fallback": "demo-429" })
    }
    if (!r.ok) {
      // irgendein anderer Fehler → Fallback Demo
      const demoSorted = [...(demo as Release[])].sort((b, a) =>
        (a.releaseDate || "").localeCompare(b.releaseDate || "")
      )
      return ok({ releases: demoSorted }, { "x-fallback": "demo-error" })
    }

    const data = await r.json()
    const items: any[] = data?.albums?.items || []

    // 4) Normalisieren
    let releases = items.map(toBaseItem)

    // 5) Optional begrenzen (Dev)
    if (devLimit && releases.length > devLimit) {
      releases = releases.slice(0, devLimit)
    }

    // 6) Neueste zuerst
    releases.sort((b, a) => (a.releaseDate || "").localeCompare(b.releaseDate || ""))

    // 7) Cache (10 Min)
    CACHE = { data: releases, exp: Date.now() + 10 * 60 * 1000 }

    return ok({ releases }, { "x-cache": "miss" })
  } catch (err: any) {
    // Absolute Feuerwehr-Leiter: Fallback Demo, damit die Seite nie leer bleibt
    const demoSorted = [...(demo as Release[])].sort((b, a) =>
      (a.releaseDate || "").localeCompare(b.releaseDate || "")
    )
    return ok({ releases: demoSorted, error: err?.message ?? "unknown" }, { "x-fallback": "demo-catch" })
  }
}
