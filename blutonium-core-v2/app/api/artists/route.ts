import { NextResponse } from "next/server"
import { getSpotifyToken, ARTISTS } from "../../../lib/spotify"

export const dynamic = "force-dynamic"

export async function GET() {
  const token = await getSpotifyToken()
  const headers = { Authorization: `Bearer ${token}` }

  const details = await Promise.all(
    ARTISTS.map(async (id) => {
      const r = await fetch(`https://api.spotify.com/v1/artists/${id}`, { headers, cache: "no-store" })
      return await r.json()
    })
  )

  const normalized = details.map((a: any) => ({
    id: a.id,
    name: a.name,
    image: a.images?.[0]?.url || null,
    spotifyUrl: a.external_urls?.spotify,
    appleUrl: `https://music.apple.com/de/artist/${encodeURIComponent(a.name)}`,
    beatportUrl: `https://www.beatport.com/search?q=${encodeURIComponent(a.name)}`,
  }))

  return NextResponse.json({ artists: normalized })
}
