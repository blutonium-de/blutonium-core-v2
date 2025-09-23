// app/api/youtube/route.ts
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// UC → UU (Uploads-Playlist)
function uploadsPlaylistId(channelId: string) {
  return channelId?.startsWith("UC") ? "UU" + channelId.slice(2) : ""
}

function parseRss(xml: string) {
  const entries = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || []
  const get = (s: string, tag: string) => s.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1]?.trim() ?? null
  const getAttr = (s: string, tag: string, attr: string) => s.match(new RegExp(`<${tag}\\b[^>]*\\b${attr}="([^"]+)"`, "i"))?.[1] ?? null

  return entries.map((e) => {
    const id =
      get(e, "yt:videoId") ||
      get(e, "id")?.match(/(?:videos|watch)[^A-Za-z0-9_-]*([A-Za-z0-9_-]{6,})/)?.[1] ||
      null
    if (!id) return null
    const title = get(e, "title") || "(ohne Titel)"
    const published = get(e, "published")
    const thumb = getAttr(e, "media:thumbnail", "url") || getAttr(e, "media:content", "url") || null
    return { id, title, publishedAt: published, thumbnail: thumb }
  }).filter(Boolean) as Array<{ id: string; title: string; publishedAt: string | null; thumbnail: string | null }>
}

async function fetchText(url: string) {
  const r = await fetch(url, { cache: "no-store", next: { revalidate: 600 } })
  const text = await r.text()
  return { ok: r.ok, status: r.status, text, url }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const max = Math.min(Number(searchParams.get("max") || "12"), 50)
  const pageToken = searchParams.get("pageToken") || undefined
  const debug = searchParams.get("debug") === "1"

  const channel = process.env.NEXT_PUBLIC_YT_CHANNEL_ID || ""
  if (!channel) {
    return NextResponse.json({ error: "Fehlende ENV: NEXT_PUBLIC_YT_CHANNEL_ID" }, { status: 500 })
  }

  const out: any = { steps: [] }

  // 1) YouTube Data API (Server-Key)
  const serverKey = process.env.YOUTUBE_API_KEY || ""
  if (serverKey) {
    try {
      const playlistId = uploadsPlaylistId(channel)
      const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems")
      url.searchParams.set("key", serverKey)
      url.searchParams.set("playlistId", playlistId)
      url.searchParams.set("part", "snippet,contentDetails")
      url.searchParams.set("maxResults", String(max))
      if (pageToken) url.searchParams.set("pageToken", pageToken)

      const r = await fetch(url.toString(), { next: { revalidate: 600 } })
      const data = await r.json()
      out.steps.push({ api: "youtube-api", status: r.status })

      if (r.ok && Array.isArray(data.items)) {
        const videos = data.items.map((it: any) => {
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
        }).filter(Boolean)

        const body = {
          videos,
          nextPageToken: data.nextPageToken || null,
          source: "youtube-api",
          ...(debug ? out : {}),
        }
        return NextResponse.json(body)
      } else if (!r.ok) {
        out.steps.push({ api: "youtube-api-error", error: data?.error || data })
      }
    } catch (e: any) {
      out.steps.push({ api: "youtube-api-ex", msg: e?.message })
    }
  } else {
    out.steps.push({ note: "YOUTUBE_API_KEY fehlt → gehe direkt zu RSS" })
  }

  // 2) RSS Kanal
  const rss1 = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel)}`)
  out.steps.push({ rssChannel: { url: rss1.url, status: rss1.status } })
  let videos = rss1.ok ? parseRss(rss1.text) : []

  // 3) RSS Uploads-Playlist
  if (!videos.length) {
    const pl = uploadsPlaylistId(channel)
    const rss2 = await fetchText(`https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(pl)}`)
    out.steps.push({ rssPlaylist: { url: rss2.url, status: rss2.status } })
    if (rss2.ok) videos = parseRss(rss2.text)
  }

  // 4) Proxy-Fallback (um 404/Bot-Sperren zu umgehen)
  if (!videos.length) {
    const prox1 = await fetchText(`https://r.jina.ai/http://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel)}`)
    out.steps.push({ rssProxyChannel: { url: prox1.url, status: prox1.status } })
    if (prox1.ok) videos = parseRss(prox1.text)

    if (!videos.length) {
      const pl = uploadsPlaylistId(channel)
      const prox2 = await fetchText(`https://r.jina.ai/http://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(pl)}`)
      out.steps.push({ rssProxyPlaylist: { url: prox2.url, status: prox2.status } })
      if (prox2.ok) videos = parseRss(prox2.text)
    }
  }

  if (videos.length) {
    if (videos.length > max) videos = videos.slice(0, max)
    return NextResponse.json({ videos, nextPageToken: null, source: "rss/proxy", ...(debug ? out : {}) })
  }

  // Nichts gefunden
  return NextResponse.json(
    {
      error: "Kein Feed verfügbar (API geblockt/RSS leer)",
      source: "rss",
      ...(debug ? out : {}),
    },
    { status: 200 }
  )
}