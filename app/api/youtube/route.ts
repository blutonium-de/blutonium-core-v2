// app/api/youtube/route.ts
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Uploads-Playlist: UCxxxx -> UUxxxx
function uploadsPlaylistId(channelId: string) {
  return channelId?.startsWith("UC") ? "UU" + channelId.slice(2) : ""
}

// --- RSS Parser robust ---
function parseRss(xml: string) {
  const entries = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || []
  const get = (s: string, tag: string) => {
    const m = s.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))
    return m?.[1]?.trim() ?? null
  }
  const getAttr = (s: string, tag: string, attr: string) => {
    const m = s.match(new RegExp(`<${tag}\\b[^>]*\\b${attr}="([^"]+)"`, "i"))
    return m?.[1] ?? null
  }

  const list = entries.map((e) => {
    const id =
      get(e, "yt:videoId") ||
      get(e, "id")?.match(/(?:videos|watch)[^A-Za-z0-9_-]*([A-Za-z0-9_-]{6,})/)?.[1] ||
      null
    if (!id) return null
    const title = get(e, "title") || "(ohne Titel)"
    const published = get(e, "published")
    const thumb =
      getAttr(e, "media:thumbnail", "url") ||
      getAttr(e, "media:content", "url") ||
      null
    return { id, title, publishedAt: published, thumbnail: thumb }
  }).filter(Boolean) as Array<{ id: string; title: string; publishedAt: string | null; thumbnail: string | null }>

  return list
}

async function fetchText(url: string) {
  const r = await fetch(url, { cache: "no-store", next: { revalidate: 600 } })
  const txt = await r.text()
  return { ok: r.ok, status: r.status, text: txt }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const max = Math.min(Number(searchParams.get("max") || "12"), 50)
    const pageToken = searchParams.get("pageToken") || undefined

    const channel = process.env.NEXT_PUBLIC_YT_CHANNEL_ID || ""
    if (!channel) {
      return NextResponse.json({ error: "Fehlende ENV: NEXT_PUBLIC_YT_CHANNEL_ID" }, { status: 500 })
    }

    // 1) Server-API-Key bevorzugen (nicht öffentlich)
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
        if (r.ok) {
          const videos = (data.items || []).map((it: any) => {
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
          return NextResponse.json({
            videos,
            nextPageToken: data.nextPageToken || null,
            source: "youtube-api",
          })
        }
      } catch {
        // leise auf RSS-Fallback gehen
      }
    }

    // 2) RSS-Fallback: Kanal-Feed
    const rssChannel = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel)}`
    let rss = await fetchText(rssChannel)
    let videos = rss.ok ? parseRss(rss.text) : []

    // 3) Wenn leer/404 → Uploads-Playlist als RSS
    if (!videos.length) {
      const pl = uploadsPlaylistId(channel)
      const rssPl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(pl)}`
      rss = await fetchText(rssPl)
      videos = rss.ok ? parseRss(rss.text) : []
      if (videos.length) {
        if (videos.length > max) videos = videos.slice(0, max)
        return NextResponse.json({ videos, nextPageToken: null, source: "rss-playlist" })
      }
    }

    // 4) Wenn immer noch leer → Proxy-Fallback, um 404/Bot-Block zu umgehen
    if (!videos.length) {
      const prox = `https://r.jina.ai/http://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel)}`
      const pr = await fetchText(prox)
      if (pr.ok) {
        videos = parseRss(pr.text)
      }
      if (!videos.length) {
        // Letzter Versuch: Uploads-Playlist via Proxy
        const pl = uploadsPlaylistId(channel)
        const proxPl = `https://r.jina.ai/http://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(pl)}`
        const pr2 = await fetchText(proxPl)
        if (pr2.ok) videos = parseRss(pr2.text)
      }
    }

    if (!videos.length) {
      return NextResponse.json(
        { error: "Kein Feed verfügbar (API geblockt & RSS 404/leer)", source: "rss", status: rss.status ?? 0 },
        { status: 200 }
      )
    }

    if (videos.length > max) videos = videos.slice(0, max)
    return NextResponse.json({ videos, nextPageToken: null, source: "rss/proxy" })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unbekannter Fehler" }, { status: 500 })
  }
}