// app/api/youtube/route.ts
import { NextResponse } from "next/server"

// dynamisch erzwingen (keine statische Cache-Version)
export const dynamic = "force-dynamic"

type YTItem = {
  id: string
  title: string
  thumb: string
  publishedAt: string
  url: string
}

function ok(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  })
}

async function fetchJSON(url: string) {
  const r = await fetch(url, { cache: "no-store" })
  const j = await r.json().catch(() => ({}))
  return { r, j }
}

// Nur echte Videos durchlassen (brauchen eine videoId)
function mapApiItems(items: any[]): YTItem[] {
  return (items || [])
    .map((it) => {
      const sn = it?.snippet || {}
      const idObj = it?.id
      const videoId =
        it?.contentDetails?.videoId ||
        (idObj && typeof idObj === "object" ? idObj.videoId : "") ||
        ""

      if (!videoId) return null

      const thumbs = sn?.thumbnails || {}
      const thumb =
        thumbs?.maxres?.url ||
        thumbs?.standard?.url ||
        thumbs?.high?.url ||
        thumbs?.medium?.url ||
        thumbs?.default?.url ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

      return {
        id: videoId,
        title: sn?.title || "",
        thumb,
        publishedAt: sn?.publishedAt || "",
        url: `https://www.youtube.com/watch?v=${videoId}`,
      } as YTItem
    })
    .filter(Boolean) as YTItem[]
}

export async function GET(req: Request) {
  const steps: any[] = []
  try {
    const key = process.env.YOUTUBE_API_KEY
    const channel = process.env.NEXT_PUBLIC_YT_CHANNEL_ID
    if (!channel) {
      return ok({ error: "NEXT_PUBLIC_YT_CHANNEL_ID fehlt", source: "env", steps }, 500)
    }

    const { searchParams } = new URL(req.url)
    const max = Math.min(Number(searchParams.get("max") || "12"), 50)

    // === 1) YouTube Data API ===
    if (key) {
      // 1a) Kanal → uploads-Playlist-ID ermitteln
      {
        const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channel}&key=${key}`
        const { r, j } = await fetchJSON(url)
        steps.push({ api: "channels.list", status: r.status })
        if (r.ok) {
          const uploads =
            j?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads || null
          if (uploads) {
            const url2 = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=${max}&playlistId=${uploads}&key=${key}`
            const { r: r2, j: j2 } = await fetchJSON(url2)
            steps.push({ api: "playlistItems.list", status: r2.status })
            if (r2.ok) {
              const videos = mapApiItems(j2?.items || [])
              if (videos.length) return ok({ videos, source: "youtube-api", steps })
            } else {
              steps.push({ api: "playlistItems-error", error: j2 })
            }
          }
        }
      }

      // 1b) Fallback: search.list – zuerst mit type=video, dann ohne
      {
        const base =
          `https://www.googleapis.com/youtube/v3/search` +
          `?part=snippet&channelId=${encodeURIComponent(channel)}` +
          `&order=date&maxResults=${max}&key=${encodeURIComponent(key)}`

        // Versuch 1: nur Videos
        {
          const url = `${base}&type=video`
          const { r, j } = await fetchJSON(url)
          steps.push({ api: "search.list(type=video)", status: r.status })
          if (r.ok) {
            const videos = mapApiItems(j?.items || []).slice(0, max)
            if (videos.length) return ok({ videos, source: "youtube-api-search", steps })
          } else {
            steps.push({ api: "search.list(type=video)-error", error: j })
          }
        }

        // Versuch 2: ohne type (YouTube liefert sonst manchmal leer)
        {
          const url = base
          const { r, j } = await fetchJSON(url)
          steps.push({ api: "search.list(no-type)", status: r.status })
          if (r.ok) {
            const videos = mapApiItems(j?.items || []).slice(0, max)
            if (videos.length) return ok({ videos, source: "youtube-api-search", steps })
          } else {
            steps.push({ api: "search.list(no-type)-error", error: j })
          }
        }
      }
    }

    // === 2) Fallback RSS (wenn API fehlschlägt oder kein KEY) ===
    const rssUrls = [
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channel}`,
      `https://www.youtube.com/feeds/videos.xml?playlist_id=UU${channel.substring(2)}`,
    ]
    for (const u of rssUrls) {
      try {
        const r = await fetch(u, { cache: "no-store" })
        steps.push({ rss: u, status: r.status })
        if (r.ok) {
          const xml = await r.text()
          if (xml.includes("<entry")) {
            return ok({ error: "RSS noch nicht geparsed", source: "rss", steps, status: 501 })
          }
        }
      } catch {}
    }

    return ok({ error: "Kein Feed verfügbar (API geblockt/RSS leer)", source: "rss", steps }, 404)
  } catch (e: any) {
    return ok({ error: e?.message || "Unbekannter Fehler", source: "catch", steps }, 500)
  }
}