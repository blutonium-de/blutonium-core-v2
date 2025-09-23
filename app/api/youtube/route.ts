// app/api/youtube/route.ts
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Uploads-Playlist aus Channel-ID bilden (UCxxxx -> UUxxxx)
function uploadsPlaylistId(channelId: string) {
  if (!channelId) return ""
  return channelId.startsWith("UC") ? ("UU" + channelId.slice(2)) : channelId
}

// ---- RSS Parser (robust über globale <entry>...</entry>-Matches) ----
function parseRss(xml: string) {
  const entries = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || []
  const get = (s: string, tag: string) => {
    const m = s.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"))
    return m?.[1]?.trim() ?? null
  }
  const getAttr = (s: string, tag: string, attr: string) => {
    const m = s.match(new RegExp(`<${tag}\\b[^>]*\\b${attr}="([^"]+)"`, "i"))
    return m?.[1] ?? null
  }

  const vids = entries.map((entry) => {
    const id =
      get(entry, "yt:videoId") ||
      // Fallback: id kann als URL mit ".../videos/<id>" kommen
      (get(entry, "id")?.match(/(?:videos|watch)\W.*?([A-Za-z0-9_-]{6,})/)?.[1] ?? null)

    const title = get(entry, "title") || "(ohne Titel)"
    const published = get(entry, "published")

    // Thumbnails: erst media:thumbnail, dann media:content (falls Video-Bild drin)
    const thumb =
      getAttr(entry, "media:thumbnail", "url") ||
      getAttr(entry, "media:content", "url") ||
      null

    if (!id) return null
    return { id, title, publishedAt: published, thumbnail: thumb }
  }).filter(Boolean) as Array<{ id: string; title: string; publishedAt: string | null; thumbnail: string | null }>

  return vids
}

async function fetchRss(url: string) {
  const r = await fetch(url, { cache: "no-store", next: { revalidate: 600 } })
  const xml = await r.text()
  return { ok: r.ok, status: r.status, xml }
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

    // 1) YouTube Data API (nur wenn Key vorhanden). Holt die Uploads-Playlist (verlässlicher).
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
        // Wenn API 403 wegen Referrer/Restriktionen -> unten RSS-Fallback
      } catch {
        // stiller Fallback auf RSS
      }
    }

    // 2) RSS-Fallback:
    //    a) Kanal-Feed
    const rssChannelUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel)}`
    let rss = await fetchRss(rssChannelUrl)
    let videos = rss.ok ? parseRss(rss.xml) : []

    //    b) Falls leer: Uploads-Playlist als RSS
    if (!videos.length) {
      const playlistId = uploadsPlaylistId(channel)
      const rssPlaylistUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistId)}`
      rss = await fetchRss(rssPlaylistUrl)
      videos = rss.ok ? parseRss(rss.xml) : []
      if (videos.length) {
        if (videos.length > max) videos = videos.slice(0, max)
        return NextResponse.json({ videos, nextPageToken: null, source: "rss-playlist" })
      }
    }

    //    c) Wenn immer noch leer: gib eine Diagnose zurück
    if (!videos.length) {
      const sample = (rss.xml || "").slice(0, 500) // kleiner Ausschnitt
      return NextResponse.json(
        { error: "RSS lieferte keine Video-Entries", source: "rss", status: rss.status, sample },
        { status: 200 }
      )
    }

    if (videos.length > max) videos = videos.slice(0, max)
    return NextResponse.json({ videos, nextPageToken: null, source: "rss" })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unbekannter Fehler" }, { status: 500 })
  }
}