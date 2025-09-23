// app/api/youtube/route.ts
import { NextResponse } from "next/server"

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

function mapApiItems(items: any[], max: number): YTItem[] {
  const out: YTItem[] = []
  for (const it of items || []) {
    const sn = it?.snippet || {}
    const idObj = it?.id
    const videoId =
      it?.contentDetails?.videoId ||
      (idObj && typeof idObj === "object" ? idObj.videoId : "") ||
      ""

    if (!videoId) continue

    const thumbs = sn?.thumbnails || {}
    const thumb =
      thumbs?.maxres?.url ||
      thumbs?.standard?.url ||
      thumbs?.high?.url ||
      thumbs?.medium?.url ||
      thumbs?.default?.url ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

    out.push({
      id: videoId,
      title: sn?.title || "",
      thumb,
      publishedAt: sn?.publishedAt || "",
      url: `https://www.youtube.com/watch?v=${videoId}`,
    })
    if (out.length >= max) break
  }
  return out
}

/** Sehr einfacher RSS-Parser für YouTube-XML (ohne DOM). */
function parseYoutubeRss(xml: string, max: number): YTItem[] {
  if (!xml || !xml.includes("<entry")) return []
  const entries = xml.split("<entry>").slice(1)
  const items: YTItem[] = []
  for (const raw of entries) {
    const videoId = matchOne(raw, /<yt:videoId>([^<]+)<\/yt:videoId>/)
    if (!videoId) continue
    const title =
      decode(matchOne(raw, /<title>([\s\S]*?)<\/title>/)) || "Untitled"
    const published =
      matchOne(raw, /<published>([^<]+)<\/published>/) || ""
    // media:thumbnail URL
    const thumb =
      matchOne(raw, /<media:thumbnail[^>]+url="([^"]+)"/) ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

    items.push({
      id: videoId,
      title,
      publishedAt: published,
      thumb,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    })
    if (items.length >= max) break
  }
  return items
}

function matchOne(s: string, re: RegExp) {
  const m = s.match(re)
  return m ? m[1] : ""
}

function decode(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
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

    // === 1) YouTube Data API (falls Key vorhanden) ===
    if (key) {
      // 1a) uploads-Playlist ermitteln und playlistItems holen
      {
        const u1 = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channel}&key=${key}`
        const { r: r1, j: j1 } = await fetchJSON(u1)
        steps.push({ api: "channels.list", status: r1.status })
        const uploads = j1?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
        if (r1.ok && uploads) {
          const u2 = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploads}&maxResults=${max}&key=${key}`
          const { r: r2, j: j2 } = await fetchJSON(u2)
          steps.push({ api: "playlistItems.list", status: r2.status })
          if (r2.ok) {
            const videos = mapApiItems(j2?.items || [], max)
            if (videos.length) return ok({ videos, source: "youtube-api", steps })
          } else {
            steps.push({ api: "playlistItems.error", error: j2 })
          }
        }
      }

      // 1b) Fallback: search.list (nur Videos)
      {
        const base =
          `https://www.googleapis.com/youtube/v3/search` +
          `?part=snippet&channelId=${encodeURIComponent(channel)}` +
          `&order=date&maxResults=${max}&key=${encodeURIComponent(key)}`

        // Versuch 1: nur Videos
        {
          const u = `${base}&type=video`
          const { r, j } = await fetchJSON(u)
          steps.push({ api: "search.list(type=video)", status: r.status })
          if (r.ok) {
            const videos = mapApiItems(j?.items || [], max)
            if (videos.length) return ok({ videos, source: "youtube-api-search", steps })
          } else {
            steps.push({ api: "search.list(type=video).error", error: j })
          }
        }

        // Versuch 2: ohne type (manche Channels sind sonderbar gefiltert)
        {
          const u = base
          const { r, j } = await fetchJSON(u)
          steps.push({ api: "search.list(no-type)", status: r.status })
          if (r.ok) {
            const videos = mapApiItems(j?.items || [], max)
            if (videos.length) return ok({ videos, source: "youtube-api-search", steps })
          } else {
            steps.push({ api: "search.list(no-type).error", error: j })
          }
        }
      }
    }

    // === 2) RSS-Fallback (ohne API-Key) ===
    // a) Kanal-Feed
    const rssA = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel}`
    try {
      const ra = await fetch(rssA, { cache: "no-store" })
      steps.push({ rss: rssA, status: ra.status })
      if (ra.ok) {
        const xml = await ra.text()
        const vids = parseYoutubeRss(xml, max)
        if (vids.length) return ok({ videos: vids, source: "rss", steps })
      }
    } catch {}

    // b) Legacy Playlist-Feed (UU + channel.substr(2))
    const rssB = `https://www.youtube.com/feeds/videos.xml?playlist_id=UU${channel.substring(2)}`
    try {
      const rb = await fetch(rssB, { cache: "no-store" })
      steps.push({ rss: rssB, status: rb.status })
      if (rb.ok) {
        const xml = await rb.text()
        const vids = parseYoutubeRss(xml, max)
        if (vids.length) return ok({ videos: vids, source: "rss", steps })
      }
    } catch {}

    // c) Proxy-RSS (um Referrer/geo-blocks zu umgehen)
    const prA = `https://r.jina.ai/http://www.youtube.com/feeds/videos.xml?channel_id=${channel}`
    try {
      const rpA = await fetch(prA, { cache: "no-store" })
      steps.push({ rssProxy: prA, status: rpA.status })
      if (rpA.ok) {
        const xml = await rpA.text()
        const vids = parseYoutubeRss(xml, max)
        if (vids.length) return ok({ videos: vids, source: "rss-proxy", steps })
      }
    } catch {}

    const prB = `https://r.jina.ai/http://www.youtube.com/feeds/videos.xml?playlist_id=UU${channel.substring(2)}`
    try {
      const rpB = await fetch(prB, { cache: "no-store" })
      steps.push({ rssProxy: prB, status: rpB.status })
      if (rpB.ok) {
        const xml = await rpB.text()
        const vids = parseYoutubeRss(xml, max)
        if (vids.length) return ok({ videos: vids, source: "rss-proxy", steps })
      }
    } catch {}

    return ok({ error: "Kein Feed verfügbar (API geblockt/RSS leer)", source: "rss", steps }, 404)
  } catch (e: any) {
    return ok({ error: e?.message || "Unbekannter Fehler", source: "catch", steps }, 500)
  }
}