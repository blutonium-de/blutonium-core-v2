// app/api/album/[id]/route.ts
import { NextResponse } from "next/server"
import { getSpotifyToken } from "../../../../lib/spotify"

export const dynamic = "force-dynamic"
const MARKET = process.env.SPOTIFY_MARKET || "DE"

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 })

  try {
    const token = await getSpotifyToken()
    const headers = { Authorization: `Bearer ${token}` }

    // bis zu 5 sanfte Retries bei 429
    for (let i = 0; i < 5; i++) {
      const r = await fetch(
        `https://api.spotify.com/v1/albums/${id}?market=${MARKET}`,
        { headers, cache: "no-store" }
      )
      if (r.status === 429) {
        const retry = Number(r.headers.get("retry-after") || 3) * 1000
        await sleep(retry)
        continue
      }
      if (!r.ok) {
        const txt = await r.text()
        return NextResponse.json({ error: txt }, { status: r.status })
      }
      const a = await r.json()

      const RADIO_RE = /(radio|short|edit|single edit|video edit|cut|mix)/i
      const details = {
        id: a.id,
        tracks: (a.tracks?.items || []).map((t: any) => ({
          id: t.id,
          title: t.name,
          isRadioEdit: RADIO_RE.test(t.name),
          previewUrl: t.preview_url,
          spotifyUrl: `https://open.spotify.com/track/${t.id}`,
          durationMs: t.duration_ms,
        })),
        copyrights: a.copyrights || [],
      }
      return NextResponse.json(details)
    }

    return NextResponse.json({ error: "rate-limited" }, { status: 429 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown" }, { status: 500 })
  }
}
