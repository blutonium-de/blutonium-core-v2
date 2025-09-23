// app/api/youtube/route.ts
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// kleine Hilfe: Uploads-Playlist aus Channel-ID bilden (UCxxxx -> UUxxxx)
function uploadsPlaylistId(channelId: string) {
  if (!channelId) return ""
  return channelId.startsWith("UC") ? ("UU" + channelId.slice(2)) : channelId
}

export async function GET(req: Request) {
  try {
    const key = process.env.NEXT_PUBLIC_YT_API_KEY
    const channel = process.env.NEXT_PUBLIC_YT_CHANNEL_ID
    if (!key || !channel) {
      return NextResponse.json(
        { error: "Fehlende ENV (NEXT_PUBLIC_YT_API_KEY oder NEXT_PUBLIC_YT_CHANNEL_ID)" },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(req.url)
    const max = Math.min(Number(searchParams.get("max") || "12"), 50)
    const pageToken = searchParams.get("pageToken") || undefined

    // **NEU**: Uploads-Playlist nutzen (deutlich zuverlässiger als search)
    const playlistId = uploadsPlaylistId(channel)

    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems")
    url.searchParams.set("key", key)
    url.searchParams.set("playlistId", playlistId)
    url.searchParams.set("part", "snippet,contentDetails")
    url.searchParams.set("maxResults", String(max))
    if (pageToken) url.searchParams.set("pageToken", pageToken)

    const r = await fetch(url.toString(), { next: { revalidate: 600 } })
    const data = await r.json()

    if (!r.ok) {
      // typische Fehlermeldung, wenn der API Key „HTTP-Referrer“ zu streng beschränkt ist
      return NextResponse.json(
        { error: data?.error?.message || `YouTube API ${r.status}`, raw: data },
        { status: r.status }
      )
    }

    // auf „Videos“ reduzieren
    const videos =
      (data.items || [])
        .map((it: any) => {
          const sn = it.snippet
          const vid = it.contentDetails?.videoId
          if (!sn || !vid) return null
          return {
            id: vid,
            title: sn.title,
            publishedAt: sn.publishedAt,
            thumbnail:
              sn.thumbnails?.maxres?.url ||
              sn.thumbnails?.high?.url ||
              sn.thumbnails?.medium?.url ||
              sn.thumbnails?.default?.url ||
              null,
          }
        })
        .filter(Boolean)

    return NextResponse.json({
      videos,
      nextPageToken: data.nextPageToken || null,
      source: "playlistItems",
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unbekannter Fehler" }, { status: 500 })
  }
}