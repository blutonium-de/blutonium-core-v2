// app/api/youtube/route.ts
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Uploads-Playlist aus Channel-ID bilden (UCxxxx -> UUxxxx)
function uploadsPlaylistId(channelId: string) {
  if (!channelId) return ""
  return channelId.startsWith("UC") ? ("UU" + channelId.slice(2)) : channelId
}

// --- RSS-Fallback: einfache Parser-Helfer ---
function pickTag(block: string, tag: string) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"))
  return m?.[1] ?? null
}
function pickAttr(block: string, tagWithNs: string, attr: string) {
  const m = block.match(new RegExp(`<${tagWithNs}[^>]*\\b${attr}="([^"]+)"`, "i"))
  return m?.[1] ?? null
}
function parseRss(xml: string) {
  // splitte auf <entry>…</entry>
  const entries = xml.split(/<entry[\s>]/i).slice(1)
  const videos = entries.map((rest) => {
    const entry = "<entry " + rest // für die Regex-Lesbarkeit
    const id = pickTag(entry, "yt:videoId") || pickTag(entry, "id") // Fallback
    const title = pickTag(entry, "title")
    const published = pickTag(entry, "published")
    // Thumbnail steckt in media:group / media:thumbnail url=""
    const thumb =
      pickAttr(entry, "media:thumbnail", "url") ||
      pickAttr(entry, "media:content", "url") ||
      null
    if (!id) return null
    return {
      id,
      title: title || "(ohne Titel)",
      publishedAt: published || null,
      thumbnail: thumb,
    }
  }).filter(Boolean) as Array<{id:string;title:string;publishedAt:string|null;thumbnail:string|null}>
  return videos
}

export async function GET(req: Request) {
  try {
    const key = process.env.NEXT_PUBLIC_YT_API_KEY
    const channel = process.env.NEXT_PUBLIC_YT_CHANNEL_ID
    if (!channel) {
      return NextResponse.json(
        { error: "Fehlende ENV: NEXT_PUBLIC_YT_CHANNEL_ID" },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(req.url)
    const max = Math.min(Number(searchParams.get("max") || "12"), 50)
    const pageToken = searchParams.get("pageToken") || undefined

    // 1) Versuche YouTube Data API (nur wenn Key vorhanden)
    if (key) {
      try {
        const playlistId = uploadsPlaylistId(channel)
        const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems")
        url.searchParams.set("key", key)
        url.searchParams.set("playlistId", playlistId)
        url.searchParams.set("part", "snippet,contentDetails")
        url.searchParams.set("maxResults", String(max))
        if (pageToken) url.searchParams.set("pageToken", pageToken)

        const r = await fetch(url.toString(), { next: { revalidate: 600 } })
        const data = await r.json()

        if (r.ok) {
          const videos = (data.items || [])
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
            source: "youtube-api",
          })
        }

        // 403 wegen Referrer-Policy? → Fallback auf RSS
        // (API_KEY_HTTP_REFERRER_BLOCKED / Requests from referer <empty> are blocked.)
        // Wir fallen einfach unten in den RSS-Zweig.
      } catch {
        // ignoriere, und nutze RSS
      }
    }

    // 2) RSS-Fallback (keylos, stabil)
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel)}`
    const rr = await fetch(rssUrl, { next: { revalidate: 600 } })
    if (!rr.ok) {
      return NextResponse.json(
        { error: `RSS ${rr.status}`, raw: await rr.text() },
        { status: rr.status }
      )
    }
    const xml = await rr.text()
    let videos = parseRss(xml)
    if (videos.length > max) videos = videos.slice(0, max)

    return NextResponse.json({
      videos,
      nextPageToken: null, // RSS paged nicht
      source: "rss",
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unbekannter Fehler" }, { status: 500 })
  }
}