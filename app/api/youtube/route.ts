// app/api/youtube/route.ts
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// ---- kleine Hilfen ----
type YtVideo = {
  id: string
  title: string
  thumb: string
  publishedAt: string
  url: string
}

function ok(body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  })
}

async function getJSON<T = any>(url: string) {
  const r = await fetch(url, { cache: "no-store" })
  const data = await r.json().catch(() => ({}))
  return { ok: r.ok, status: r.status, data }
}

function uploadsIdFromChannelId(uc: string) {
  // UCxxxxxxxx -> UUxxxxxxxx  (Uploads-Playlist von YouTube)
  if (!uc || uc.length < 3 || !uc.startsWith("UC")) return null
  return "UU" + uc.slice(2)
}

function pickThumb(snippet: any): string {
  const t = snippet?.thumbnails || {}
  return (
    t?.maxres?.url ||
    t?.standard?.url ||
    t?.high?.url ||
    t?.medium?.url ||
    t?.default?.url ||
    ""
  )
}

// ultraleichtes RSS-Parsing ohne XML-Parser (Server-only)
function parseYouTubeRss(xml: string): YtVideo[] {
  if (!xml || !xml.includes("<entry")) return []
  const entries = xml.split("<entry>").slice(1)
  const vids: YtVideo[] = []
  for (const e of entries) {
    const id = (e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1]
    const title = (e.match(/<title>([^<]+)<\/title>/) || [])[1]
    const published = (e.match(/<published>([^<]+)<\/published>/) || [])[1]
    // Thumbnail: media:thumbnail url="..."
    const thumb =
      (e.match(/media:thumbnail[^>]+url="([^"]+)"/) || [])[1] ||
      (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "")
    if (id) {
      vids.push({
        id,
        title,
        thumb,
        publishedAt: published || "",
        url: `https://www.youtube.com/watch?v=${id}`,
      })
    }
  }
  return vids
}

export async function GET(req: Request) {
  const steps: any[] = []
  try {
    const { searchParams } = new URL(req.url)
    const max = Math.min(Number(searchParams.get("max") || "12"), 50)
    const pageToken = searchParams.get("pageToken") || undefined

    const API_KEY = process.env.YOUTUBE_API_KEY || "" // Server-ENV
    const CHANNEL_ID =
      (searchParams.get("channel") ||
        process.env.NEXT_PUBLIC_YT_CHANNEL_ID ||
        "").trim()

    if (!CHANNEL_ID) {
      return ok(
        { error: "Kein Channel gesetzt", videos: [], source: "config", steps },
        400
      )
    }

    // ================================
    // 1) YouTube Data API – bevorzugt
    // ================================
    if (API_KEY) {
      // a) Kanal laden (contentDetails) → offizielle Uploads-Playlist
      const chUrl = new URL("https://www.googleapis.com/youtube/v3/channels")
      chUrl.searchParams.set("key", API_KEY)
      chUrl.searchParams.set("part", "contentDetails,snippet")
      chUrl.searchParams.set("id", CHANNEL_ID)
      const ch = await getJSON(chUrl.toString())
      steps.push({ api: "channels.list", status: ch.status })

      let uploadsId =
        ch?.data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ||
        uploadsIdFromChannelId(CHANNEL_ID)

      // b) Videos aus Uploads-Playlist
      if (uploadsId) {
        const plUrl = new URL(
          "https://www.googleapis.com/youtube/v3/playlistItems"
        )
        plUrl.searchParams.set("key", API_KEY)
        plUrl.searchParams.set("part", "snippet,contentDetails")
        plUrl.searchParams.set("playlistId", uploadsId)
        plUrl.searchParams.set("maxResults", String(max))
        if (pageToken) plUrl.searchParams.set("pageToken", pageToken)

        const pl = await getJSON(plUrl.toString())
        steps.push({ api: "playlistItems.list", status: pl.status })

        if (pl.ok && Array.isArray(pl.data?.items)) {
          const items = pl.data.items as any[]
          const videos: YtVideo[] = items
            .map((it) => {
              const s = it.snippet
              const vid = s?.resourceId?.videoId || it.contentDetails?.videoId
              if (!vid) return null
              return {
                id: vid,
                title: s?.title || "",
                thumb: pickThumb(s),
                publishedAt: s?.publishedAt || it.contentDetails?.videoPublishedAt || "",
                url: `https://www.youtube.com/watch?v=${vid}`,
              } as YtVideo
            })
            .filter(Boolean)

          if (videos.length) {
            return ok({
              videos,
              nextPageToken: pl.data?.nextPageToken || null,
              source: "youtube-api-playlist",
              steps,
            })
          } else {
            steps.push({ note: "Uploads-Playlist leer" })
          }
        } else {
          steps.push({ api: "playlistItems.error", error: pl.data?.error || pl.status })
        }
      }

      // c) Fallback: channel + type=video via search.list (neueste zuerst)
      const srchUrl = new URL("https://www.googleapis.com/youtube/v3/search")
      srchUrl.searchParams.set("key", API_KEY)
      srchUrl.searchParams.set("part", "snippet")
      srchUrl.searchParams.set("channelId", CHANNEL_ID)
      srchUrl.searchParams.set("type", "video")
      srchUrl.searchParams.set("order", "date")
      srchUrl.searchParams.set("maxResults", String(max))
      if (pageToken) srchUrl.searchParams.set("pageToken", pageToken)

      const sr = await getJSON(srchUrl.toString())
      steps.push({ api: "search.list(type=video)", status: sr.status })

      if (sr.ok && Array.isArray(sr.data?.items)) {
        const videos: YtVideo[] = sr.data.items.map((it: any) => {
          const s = it.snippet
          const vid = it.id?.videoId
          return {
            id: vid,
            title: s?.title || "",
            thumb: pickThumb(s),
            publishedAt: s?.publishedAt || "",
            url: `https://www.youtube.com/watch?v=${vid}`,
          }
        })
        if (videos.length) {
          return ok({
            videos,
            nextPageToken: sr.data?.nextPageToken || null,
            source: "youtube-api-search",
            steps,
          })
        }
      }

      // Wenn wir hier landen: API hat nichts gebracht → weiter zu RSS
      steps.push({ note: "API-Fallback auf RSS" })
    } else {
      steps.push({ note: "YOUTUBE_API_KEY fehlt → gehe direkt zu RSS" })
    }

    // ================================
    // 2) RSS – Kanal
    // ================================
    const rssUrls = [
      // direkt
      `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`,
      // Upload-Playlist als RSS (kann 404 sein)
      `https://www.youtube.com/feeds/videos.xml?playlist_id=${uploadsIdFromChannelId(
        CHANNEL_ID
      )}`,
      // Proxy-Variante (um Referrer-Probleme zu umgehen)
      `https://r.jina.ai/http://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`,
      `https://r.jina.ai/http://www.youtube.com/feeds/videos.xml?playlist_id=${uploadsIdFromChannelId(
        CHANNEL_ID
      )}`,
    ]

    for (const url of rssUrls) {
      const r = await fetch(url, { cache: "no-store" })
      steps.push({ rss: url, status: r.status })
      if (!r.ok) continue
      const xml = await r.text()
      const videos = parseYouTubeRss(xml)
      if (videos.length) {
        return ok({ videos, nextPageToken: null, source: "rss", steps })
      }
    }

    // Nichts bekommen
    return ok(
      {
        videos: [],
        note: "Kein Feed verfügbar (API geblockt/RSS leer)",
        source: "rss",
        steps,
      },
      404
    )
  } catch (e: any) {
    return ok(
      { error: e?.message || "Unbekannter Fehler", videos: [], source: "catch" },
      500
    )
  }
}