// app/api/youtube/route.ts
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Wir holen die neuesten Uploads über den öffentlichen YouTube-RSS-Feed:
 * https://www.youtube.com/feeds/videos.xml?channel_id=...
 * -> Kein API-Key nötig, keine Referrer-Probleme.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const channel = process.env.NEXT_PUBLIC_YT_CHANNEL_ID?.trim()
    if (!channel) {
      return NextResponse.json(
        { error: "Fehlende ENV: NEXT_PUBLIC_YT_CHANNEL_ID" },
        { status: 500 }
      )
    }

    // Optional: max= Anzahl der zurückgegebenen Videos (default 12, max 50)
    const max = Math.min(Number(searchParams.get("max") || "12"), 50)

    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(
      channel
    )}`

    // 5 Min Revalidate ist meist angenehm
    const resp = await fetch(feedUrl, { next: { revalidate: 300 } })
    if (!resp.ok) {
      const txt = await resp.text()
      return NextResponse.json(
        { error: `RSS-Feed ${resp.status}`, raw: txt.slice(0, 2000) },
        { status: resp.status }
      )
    }

    const xml = await resp.text()

    // Sehr einfache XML-Extraktion für die Kernfelder
    // (kein externes XML-Parser-Paket nötig)
    const entries = xml.split("<entry>").slice(1) // [ ... each entry ... ]
    const videos = entries.slice(0, max).map((chunk) => {
      const pick = (tag: string) => {
        const m = chunk.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
        return m ? m[1].trim() : null
      }
      // yt:videoId hat einen Namespace, deshalb eigener RegExp
      const idMatch = chunk.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/)
      const id = idMatch ? idMatch[1].trim() : null

      const title = pick("title")
      const published = pick("published")
      const authorMatch = chunk.match(/<name>([\s\S]*?)<\/name>/)
      const author = authorMatch ? authorMatch[1].trim() : null

      // Thumbnail: stabil über i.ytimg.com
      const thumb = id
        ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
        : null

      return {
        id,
        title,
        published,
        author,
        thumbnailUrl: thumb,
        url: id ? `https://www.youtube.com/watch?v=${id}` : null,
      }
    })

    return NextResponse.json({ videos, nextPageToken: null })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unbekannter Fehler" },
      { status: 500 }
    )
  }
}