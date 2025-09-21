// app/api/artists/route.ts
import { NextResponse } from "next/server"
import { getSpotifyToken, ARTISTS } from "../../../lib/spotify"

export const dynamic = "force-dynamic"

function normalize(a: any) {
  return {
    id: a?.id ?? "",
    name: a?.name ?? "Unknown",
    image: a?.images?.[0]?.url || null,
    genres: Array.isArray(a?.genres) ? a.genres : [],
    followersTotal: a?.followers?.total ?? 0,
    spotifyUrl: a?.external_urls?.spotify ?? null,
    appleUrl: `https://music.apple.com/de/artist/${encodeURIComponent(a?.name ?? "")}`,
    beatportUrl: `https://www.beatport.com/search?q=${encodeURIComponent(a?.name ?? "")}`,
  }
}

export async function GET() {
  try {
    const token = await getSpotifyToken()
    const headers = { Authorization: `Bearer ${token}` }

    // Ungültige/Platzhalter-IDs rausfiltern
    const ids = (ARTISTS || [])
      .map((s) => String(s).trim())
      .filter((id) => id && !/^PLEASE_PUT_/i.test(id))

    if (ids.length === 0) {
      return NextResponse.json({ artists: [] })
    }

    // 1) Batch versuchen
    const batchUrl = `https://api.spotify.com/v1/artists?ids=${ids.join(",")}`
    const r = await fetch(batchUrl, { headers, cache: "no-store" })

    if (r.ok) {
      const data = await r.json()
      const list = Array.isArray(data?.artists) ? data.artists : []
      const normalized = list.filter(Boolean).map(normalize)
      return NextResponse.json({ artists: normalized })
    }

    // 2) Fallback: pro ID einzeln, Fehler ignorieren
    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const rr = await fetch(`https://api.spotify.com/v1/artists/${id}`, {
          headers,
          cache: "no-store",
        })
        if (!rr.ok) throw new Error(String(rr.status))
        return await rr.json()
      })
    )

    const okItems = results
      .filter((x): x is PromiseFulfilledResult<any> => x.status === "fulfilled" && !!x.value)
      .map((x) => normalize(x.value))

    return NextResponse.json({ artists: okItems })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "unknown" }, { status: 500 })
  }
}