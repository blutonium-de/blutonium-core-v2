// app/api/youtube/route.ts
import { NextResponse } from "next/server"

// ✅ 5-Minuten Edge-Cache pro einzigartiger Query (pageToken/max)
export const revalidate = 300
// export const dynamic = "force-dynamic"   // ❌ entfernen, sonst greift revalidate nicht

type YtItem = {
  id: string
  title: string
  thumb: string
  publishedAt: string
  url: string
}

function ok(body: any, status = 200) {
  // ✅ explizit kurz cachen (wird von revalidate ergänzt)
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  })
}

const YT_BASE = "https://www.googleapis.com/youtube/v3"
async function yt<T>(path: string, params: Record<string, string>) {
  const u = new URL(`${YT_BASE}/${path}`)
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v))
  const r = await fetch(u.toString(), { cache: "no-store" })
  const j = await r.json()
  return { ok: r.ok, status: r.status, data: j }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const key = process.env.YOUTUBE_API_KEY
  const channelId = process.env.NEXT_PUBLIC_YT_CHANNEL_ID || url.searchParams.get("channelId") || ""
  const max = Math.min(parseInt(url.searchParams.get("max") || "18", 10), 50)
  const pageToken = url.searchParams.get("pageToken") || undefined

  if (!channelId) return ok({ error: "Kein channelId gesetzt", videos: [] }, 400)

  if (!key) {
    const rss = `https://r.jina.ai/http://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
    try {
      const r = await fetch(rss, { cache: "no-store" })
      const xml = await r.text()
      const items = [...xml.matchAll(/<entry>[\s\S]*?<\/entry>/g)]
      const videos: YtItem[] = items.slice(0, max).map((m) => {
        const id = (m[0].match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1] || "").trim()
        const title = (m[0].match(/<title>(.*?)<\/title>/)?.[1] || "").trim()
        const publishedAt = (m[0].match(/<published>(.*?)<\/published>/)?.[1] || "").trim()
        const thumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
        return { id, title, publishedAt, thumb, url: `https://www.youtube.com/watch?v=${id}` }
      })
      return ok({ videos, nextPageToken: null, source: "rss-proxy" })
    } catch (e: any) {
      return ok({ error: e?.message || "RSS-Fallback fehlgeschlagen", videos: [] }, 500)
    }
  }

  // 1) Kanal → uploads-Playlist
  const channels = await yt<any>("channels", { part: "contentDetails", id: channelId, key })
  if (!channels.ok || !channels.data?.items?.length) {
    return ok({ videos: [], nextPageToken: null, source: "youtube-api", note: "channel not found" }, 404)
  }
  const uploadsPlaylist = channels.data.items[0]?.contentDetails?.relatedPlaylists?.uploads as string | undefined

  // 2) Playlist-Items
  if (uploadsPlaylist) {
    const items = await yt<any>("playlistItems", {
      part: "snippet,contentDetails",
      playlistId: uploadsPlaylist,
      maxResults: String(max),
      key,
      ...(pageToken ? { pageToken } : {}),
    })
    if (items.ok && items.data?.items?.length) {
      const videos: YtItem[] = items.data.items.map((it: any) => {
        const id = it.contentDetails?.videoId || it.snippet?.resourceId?.videoId || ""
        const title = it.snippet?.title || ""
        const publishedAt = it.contentDetails?.videoPublishedAt || it.snippet?.publishedAt || ""
        const thumb =
          it.snippet?.thumbnails?.maxres?.url ||
          it.snippet?.thumbnails?.high?.url ||
          it.snippet?.thumbnails?.medium?.url ||
          `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
        return { id, title, publishedAt, thumb, url: `https://www.youtube.com/watch?v=${id}` }
      })
      return ok({ videos, nextPageToken: items.data.nextPageToken || null, source: "youtube-api-playlist" })
    }
  }

  // 3) Fallback: irgendeine Playlist
  const playlists = await yt<any>("playlists", { part: "snippet,contentDetails", channelId, maxResults: "5", key })
  if (playlists.ok && playlists.data?.items?.length) {
    const plId = playlists.data.items[0].id as string
    const items = await yt<any>("playlistItems", {
      part: "snippet,contentDetails",
      playlistId: plId,
      maxResults: String(max),
      key,
      ...(pageToken ? { pageToken } : {}),
    })
    if (items.ok && items.data?.items?.length) {
      const videos: YtItem[] = items.data.items.map((it: any) => {
        const id = it.contentDetails?.videoId || it.snippet?.resourceId?.videoId || ""
        const title = it.snippet?.title || ""
        const publishedAt = it.contentDetails?.videoPublishedAt || it.snippet?.publishedAt || ""
        const thumb =
          it.snippet?.thumbnails?.maxres?.url ||
          it.snippet?.thumbnails?.high?.url ||
          it.snippet?.thumbnails?.medium?.url ||
          `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
        return { id, title, publishedAt, thumb, url: `https://www.youtube.com/watch?v=${id}` }
      })
      return ok({ videos, nextPageToken: items.data.nextPageToken || null, source: "youtube-api-playlists" })
    }
  }

  // 4) Fallback: channel search
  const search = await yt<any>("search", {
    part: "snippet",
    channelId,
    type: "video",
    order: "date",
    maxResults: String(max),
    key,
    ...(pageToken ? { pageToken } : {}),
  })
  if (search.ok && search.data?.items?.length) {
    const videos: YtItem[] = search.data.items.map((it: any) => {
      const id = it.id?.videoId || ""
      const title = it.snippet?.title || ""
      const publishedAt = it.snippet?.publishedAt || ""
      const thumb =
        it.snippet?.thumbnails?.maxres?.url ||
        it.snippet?.thumbnails?.high?.url ||
        it.snippet?.thumbnails?.medium?.url ||
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
      return { id, title, publishedAt, thumb, url: `https://www.youtube.com/watch?v=${id}` }
    })
    return ok({ videos, nextPageToken: search.data.nextPageToken || null, source: "youtube-api-search" })
  }

  return ok({ videos: [], nextPageToken: null, source: "empty" }, 200)
}