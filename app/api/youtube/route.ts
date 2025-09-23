// app/api/youtube/route.ts
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type YTItem = {
  id: string
  title: string
  thumb: string | null
  publishedAt: string
  url: string
}

function ok(data: any, status = 200) {
  return NextResponse.json(data, { status })
}
function err(message: string, extra: any = {}, status = 500) {
  return NextResponse.json({ error: message, ...extra }, { status })
}

async function fetchJSON(url: string) {
  const r = await fetch(url, { cache: "no-store" })
  const j = await r.json().catch(() => ({}))
  return { r, j }
}

function mapPlaylistItems(items: any[]): YTItem[] {
  return (items || []).map((it) => {
    const id = it?.contentDetails?.videoId || it?.id?.videoId || it?.id
    const sn = it?.snippet || {}
    const thumbs = sn?.thumbnails || {}
    const thumb =
      thumbs?.maxres?.url ||
      thumbs?.standard?.url ||
      thumbs?.high?.url ||
      thumbs?.medium?.url ||
      thumbs?.default?.url ||
      null
    return {
      id,
      title: sn?.title || "",
      thumb,
      publishedAt: sn?.publishedAt || "",
      url: id ? `https://www.youtube.com/watch?v=${id}` : "",
    }
  })
}

function parseRSS(xml: string): YTItem[] {
  // sehr einfacher RSS-Parser (ohne XML lib)
  const entries = xml.split("<entry>").slice(1)
  return entries.map((e) => {
    const get = (tag: string) => {
      const m = e.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))
      return m ? m[1].trim() : ""
    }
    const id = (e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1] || ""
    const title = get("title")
    const publishedAt = get("published")
    const thumb =
      (e.match(/media:thumbnail[^>]+url="([^"]+)"/) || [])[1] ||
      (e.match(/<link[^>]+href="([^"]+)"/) || [])[1] ||
      null
    return {
      id,
      title,
      thumb,
      publishedAt,
      url: id ? `https://www.youtube.com/watch?v=${id}` : "",
    }
  })
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const max = Math.min(Number(searchParams.get("max") || "12"), 50)
    const debug = searchParams.get("debug") === "1"

    const KEY = process.env.YOUTUBE_API_KEY || "" // serverseitig!
    const CHANNEL = process.env.NEXT_PUBLIC_YT_CHANNEL_ID || ""

    const steps: any[] = []

    // 1) API-Weg (nur wenn Key vorhanden)
    if (KEY && CHANNEL) {
      // 1a) echte Upload-Playlist via channels.list ermitteln
      {
        const url =
          `https://www.googleapis.com/youtube/v3/channels` +
          `?part=contentDetails&id=${encodeURIComponent(CHANNEL)}&key=${encodeURIComponent(KEY)}`
        const { r, j } = await fetchJSON(url)
        steps.push({ api: "channels.list", status: r.status })
        if (r.ok) {
          const uploads = j?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
          if (uploads) {
            // 1b) playlistItems.list
            const url2 =
              `https://www.googleapis.com/youtube/v3/playlistItems` +
              `?part=snippet,contentDetails&playlistId=${encodeURIComponent(uploads)}` +
              `&maxResults=${max}&key=${encodeURIComponent(KEY)}`
            const { r: r2, j: j2 } = await fetchJSON(url2)
            steps.push({ api: "playlistItems.list", status: r2.status })
            if (r2.ok) {
              const videos = mapPlaylistItems(j2?.items || [])
              if (videos.length) {
                return ok({ videos, source: "youtube-api", steps })
              }
            } else {
              steps.push({ api: "playlistItems-error", error: j2 })
            }
          } else {
            steps.push({ api: "channels.list-no-uploads" })
          }
        } else {
          steps.push({ api: "channels.list-error", error: j })
        }
      }

      // 1c) Fallback: search.list (Videos eines Channels, neueste zuerst)
      {
        const url =
          `https://www.googleapis.com/youtube/v3/search` +
          `?part=snippet&channelId=${encodeURIComponent(CHANNEL)}` +
          `&order=date&type=video&maxResults=${max}&key=${encodeURIComponent(KEY)}`
        const { r, j } = await fetchJSON(url)
        steps.push({ api: "search.list", status: r.status })
        if (r.ok) {
          const videos = mapPlaylistItems(j?.items || [])
          if (videos.length) {
            return ok({ videos, source: "youtube-api-search", steps })
          }
        } else {
          steps.push({ api: "search.list-error", error: j })
        }
      }
    } else {
      steps.push({ note: "YOUTUBE_API_KEY fehlt → gehe direkt zu RSS" })
    }

    // 2) RSS Fallback
    // 2a) Channel-RSS
    const rssChannel = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(CHANNEL)}`
    let rRss = await fetch(rssChannel, { cache: "no-store" })
    steps.push({ rssChannel: { url: rssChannel, status: rRss.status } })
    if (rRss.ok) {
      const xml = await rRss.text()
      let videos = parseRSS(xml).slice(0, max)
      if (videos.length) return ok({ videos, source: "rss", steps })
    }

    // 2b) Uploads-Playlist-RSS (UU… – kann 404 sein, wir probieren es)
    const uploadsGuess = CHANNEL.replace(/^UC/, "UU")
    const rssPlaylist = `https://www.youtube.com/feeds/videos.xml?playlist_id=${uploadsGuess}`
    rRss = await fetch(rssPlaylist, { cache: "no-store" })
    steps.push({ rssPlaylist: { url: rssPlaylist, status: rRss.status } })
    if (rRss.ok) {
      const xml = await rRss.text()
      let videos = parseRSS(xml).slice(0, max)
      if (videos.length) return ok({ videos, source: "rss", steps })
    }

    // 2c) Proxy-RSS (gegen Referrer/Geo-Issues)
    const prox = (u: string) => `https://r.jina.ai/http://www.youtube.com/feeds/videos.xml?${u}`
    const proxyChannel = prox(`channel_id=${encodeURIComponent(CHANNEL)}`)
    let rProxy = await fetch(proxyChannel, { cache: "no-store" })
    steps.push({ rssProxyChannel: { url: proxyChannel, status: rProxy.status } })
    if (rProxy.ok) {
      const xml = await rProxy.text()
      let videos = parseRSS(xml).slice(0, max)
      if (videos.length) return ok({ videos, source: "rss-proxy", steps })
    }

    const proxyPlaylist = prox(`playlist_id=${uploadsGuess}`)
    rProxy = await fetch(proxyPlaylist, { cache: "no-store" })
    steps.push({ rssProxyPlaylist: { url: proxyPlaylist, status: rProxy.status } })
    if (rProxy.ok) {
      const xml = await rProxy.text()
      let videos = parseRSS(xml).slice(0, max)
      if (videos.length) return ok({ videos, source: "rss-proxy", steps })
    }

    // nichts gefunden
    return ok({ error: "Kein Feed verfügbar (API geblockt/RSS leer)", source: "rss", steps }, 404)
  } catch (e: any) {
    return err(e?.message || "unknown youtube error")
  }
}