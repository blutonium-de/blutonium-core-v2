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

// robustes Mapping für API-Items (playlistItems.list ODER search.list)
function mapApiItems(items: any[]): YTItem[] {
  return (items || []).map((it) => {
    const sn = it?.snippet || {}
    const thumbs = sn?.thumbnails || {}
    const id =
      it?.contentDetails?.videoId || // playlistItems.list
      it?.id?.videoId ||             // search.list
      it?.id || ""
    const thumb =
      thumbs?.maxres?.url ||
      thumbs?.standard?.url ||
      thumbs?.high?.url ||
      thumbs?.medium?.url ||
      thumbs?.default?.url ||
      (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null)

    return {
      id,
      title: sn?.title || "",
      thumb,
      publishedAt: sn?.publishedAt || "",
      url: id ? `https://www.youtube.com/watch?v=${id}` : "",
    }
  }).filter(v => !!v.id)
}

// robuster RSS-Parser (fängt mehr Varianten ab)
function parseRSS(xml: string): YTItem[] {
  // Entferne evtl. BOM/Whitespace
  const txt = (xml || "").trim()
  if (!txt) return []

  // Splitte auf <entry> – Namespaces sind egal, <entry> bleibt gleich
  const raw = txt.split("<entry>").slice(1)
  const out: YTItem[] = []

  for (const e of raw) {
    const seg = e.split("</entry>")[0] || e

    const pick = (tag: string) => {
      const m = seg.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"))
      return m ? m[1].trim() : ""
    }

    // versuche yt:videoId
    let id = (seg.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i) || [])[1] || ""

    // wenn kein yt:videoId, aus <link rel="alternate" href="...watch?v=ID">
    if (!id) {
      const link = (seg.match(/<link[^>]+rel="alternate"[^>]+href="([^"]+)"/i) || [])[1] || ""
      const m = link.match(/[?&]v=([a-zA-Z0-9_\-]+)/)
      if (m) id = m[1]
    }

    const title = pick("title") || ""
    const publishedAt = pick("published") || ""
    let thumb =
      (seg.match(/media:thumbnail[^>]+url="([^"]+)"/i) || [])[1] || null

    if (!thumb && id) {
      thumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    }

    if (id) {
      out.push({
        id,
        title,
        thumb,
        publishedAt,
        url: `https://www.youtube.com/watch?v=${id}`,
      })
    }
  }

  return out
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const max = Math.min(Number(searchParams.get("max") || "12"), 50)

    const KEY = process.env.YOUTUBE_API_KEY || "" // serverseitig!
    const CHANNEL = process.env.NEXT_PUBLIC_YT_CHANNEL_ID || ""

    const steps: any[] = []

    // ---------- 1) API Weg (sofern KEY vorhanden) ----------
    if (KEY && CHANNEL) {
      // 1a) echte Upload-Playlist aus channels.list ermitteln
      {
        const url =
          `https://www.googleapis.com/youtube/v3/channels` +
          `?part=contentDetails&id=${encodeURIComponent(CHANNEL)}&key=${encodeURIComponent(KEY)}`
        const { r, j } = await fetchJSON(url)
        steps.push({ api: "channels.list", status: r.status })
        if (r.ok) {
          const uploads = j?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
          if (uploads) {
            const url2 =
              `https://www.googleapis.com/youtube/v3/playlistItems` +
              `?part=snippet,contentDetails&playlistId=${encodeURIComponent(uploads)}` +
              `&maxResults=${max}&key=${encodeURIComponent(KEY)}`
            const { r: r2, j: j2 } = await fetchJSON(url2)
            steps.push({ api: "playlistItems.list", status: r2.status })
            if (r2.ok) {
              const videos = mapApiItems(j2?.items || []).slice(0, max)
              if (videos.length) return ok({ videos, source: "youtube-api", steps })
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

      // 1b) Fallback: search.list (ohne type=video, manchmal liefert type=video 0 zurück)
      {
        const url =
          `https://www.googleapis.com/youtube/v3/search` +
          `?part=snippet&channelId=${encodeURIComponent(CHANNEL)}` +
          `&order=date&maxResults=${max}&key=${encodeURIComponent(KEY)}`
        const { r, j } = await fetchJSON(url)
        steps.push({ api: "search.list", status: r.status })
        if (r.ok) {
          const videos = mapApiItems(j?.items || []).slice(0, max)
          if (videos.length) return ok({ videos, source: "youtube-api-search", steps })
        } else {
          steps.push({ api: "search.list-error", error: j })
        }
      }
    } else {
      steps.push({ note: "YOUTUBE_API_KEY fehlt → gehe direkt zu RSS" })
    }

    // ---------- 2) RSS Fallback ----------
    // 2a) Channel-RSS
    if (CHANNEL) {
      const rssChannel = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(CHANNEL)}`
      let rRss = await fetch(rssChannel, { cache: "no-store" })
      steps.push({ rssChannel: { url: rssChannel, status: rRss.status } })
      if (rRss.ok) {
        const xml = await rRss.text()
        const videos = parseRSS(xml).slice(0, max)
        if (videos.length) return ok({ videos, source: "rss", steps })
      }

      // 2b) Upload-Playlist-RSS (kann 404 sein)
      const uploadsGuess = CHANNEL.replace(/^UC/i, "UU")
      const rssPlaylist = `https://www.youtube.com/feeds/videos.xml?playlist_id=${uploadsGuess}`
      rRss = await fetch(rssPlaylist, { cache: "no-store" })
      steps.push({ rssPlaylist: { url: rssPlaylist, status: rRss.status } })
      if (rRss.ok) {
        const xml = await rRss.text()
        const videos = parseRSS(xml).slice(0, max)
        if (videos.length) return ok({ videos, source: "rss", steps })
      }

      // 2c) Proxy-RSS (gegen Referrer/Geo-Issues)
      const prox = (u: string) => `https://r.jina.ai/http://www.youtube.com/feeds/videos.xml?${u}`
      const proxyChannel = prox(`channel_id=${encodeURIComponent(CHANNEL)}`)
      let rProxy = await fetch(proxyChannel, { cache: "no-store" })
      steps.push({ rssProxyChannel: { url: proxyChannel, status: rProxy.status } })
      if (rProxy.ok) {
        const xml = await rProxy.text()
        const videos = parseRSS(xml).slice(0, max)
        if (videos.length) return ok({ videos, source: "rss-proxy", steps })
      }

      const proxyPlaylist = prox(`playlist_id=${uploadsGuess}`)
      rProxy = await fetch(proxyPlaylist, { cache: "no-store" })
      steps.push({ rssProxyPlaylist: { url: proxyPlaylist, status: rProxy.status } })
      if (rProxy.ok) {
        const xml = await rProxy.text()
        const videos = parseRSS(xml).slice(0, max)
        if (videos.length) return ok({ videos, source: "rss-proxy", steps })
      }
    } else {
      steps.push({ note: "Kein CHANNEL gesetzt" })
    }

    // nichts gefunden
    return ok({ error: "Kein Feed verfügbar (API geblockt/RSS leer)", source: "rss", steps }, 404)
  } catch (e: any) {
    return err(e?.message || "unknown youtube error")
  }
}