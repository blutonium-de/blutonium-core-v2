// app/api/youtube/route.ts
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const key = process.env.YOUTUBE_API_KEY
    const channel = process.env.NEXT_PUBLIC_YT_CHANNEL_ID
    if (!key || !channel) {
      return NextResponse.json(
        { error: "Fehlende ENV Variablen (YOUTUBE_API_KEY oder NEXT_PUBLIC_YT_CHANNEL_ID)" },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(req.url)
    const max = Math.min(Number(searchParams.get("max") || "12"), 50)
    const pageToken = searchParams.get("pageToken") || undefined

    // Uploads-Playlist aus Channel holen
    const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels")
    channelUrl.searchParams.set("key", key)
    channelUrl.searchParams.set("id", channel)
    channelUrl.searchParams.set("part", "contentDetails")

    const channelRes = await fetch(channelUrl.toString())
    const channelData = await channelRes.json()

    let uploadsId =
      channelData?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads || null

    let videos: any[] = []
    let source = ""

    if (uploadsId) {
      // PlaylistItems abrufen
      const playlistUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems")
      playlistUrl.searchParams.set("key", key)
      playlistUrl.searchParams.set("playlistId", uploadsId)
      playlistUrl.searchParams.set("part", "snippet")
      playlistUrl.searchParams.set("maxResults", String(max))
      if (pageToken) playlistUrl.searchParams.set("pageToken", pageToken)

      const r = await fetch(playlistUrl.toString())
      const data = await r.json()

      if (r.ok) {
        videos = (data.items || []).map((it: any) => ({
          id: it.snippet.resourceId.videoId,
          title: it.snippet.title,
          thumb: it.snippet.thumbnails.high?.url || it.snippet.thumbnails.default?.url,
          publishedAt: it.snippet.publishedAt,
          url: `https://www.youtube.com/watch?v=${it.snippet.resourceId.videoId}`,
        }))
        return NextResponse.json({
          videos,
          nextPageToken: data.nextPageToken || null,
          source: "youtube-api-playlist",
        })
      }
    }

    // Fallback → search.list
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search")
    searchUrl.searchParams.set("key", key)
    searchUrl.searchParams.set("channelId", channel)
    searchUrl.searchParams.set("part", "snippet")
    searchUrl.searchParams.set("order", "date")
    searchUrl.searchParams.set("type", "video")
    searchUrl.searchParams.set("maxResults", String(max))
    if (pageToken) searchUrl.searchParams.set("pageToken", pageToken)

    const r = await fetch(searchUrl.toString())
    const data = await r.json()

    if (r.ok) {
      videos = (data.items || []).map((it: any) => ({
        id: it.id.videoId,
        title: it.snippet.title,
        thumb: it.snippet.thumbnails.high?.url || it.snippet.thumbnails.default?.url,
        publishedAt: it.snippet.publishedAt,
        url: `https://www.youtube.com/watch?v=${it.id.videoId}`,
      }))
      return NextResponse.json({
        videos,
        nextPageToken: data.nextPageToken || null,
        source: "youtube-api-search",
      })
    }

    return NextResponse.json(
      { error: "Kein Feed verfügbar", raw: data },
      { status: 404 }
    )
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unbekannter Fehler" },
      { status: 500 }
    )
  }
}