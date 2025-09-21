// app/api/youtube/route.ts
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const key = process.env.NEXT_PUBLIC_YT_API_KEY
    const channel = process.env.NEXT_PUBLIC_YT_CHANNEL_ID
    if (!key || !channel) {
      return NextResponse.json(
        { error: "Fehlende ENV (NEXT_PUBLIC_YT_API_KEY oder NEXT_PUBLIC_YT_CHANNEL_ID)" },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(req.url)
    const max = Math.min(Number(searchParams.get("max") || "12"), 50)
    const pageToken = searchParams.get("pageToken") || undefined

    const url = new URL("https://www.googleapis.com/youtube/v3/search")
    url.searchParams.set("key", key)
    url.searchParams.set("channelId", channel)
    url.searchParams.set("part", "snippet,id")
    url.searchParams.set("order", "date")
    url.searchParams.set("type", "video")
    url.searchParams.set("maxResults", String(max))
    if (pageToken) url.searchParams.set("pageToken", pageToken)

    const r = await fetch(url.toString(), { next: { revalidate: 600 } })
    const data = await r.json()

    if (!r.ok) {
      return NextResponse.json(
        { error: data?.error?.message || `YouTube API ${r.status}`, raw: data },
        { status: r.status }
      )
    }

    return NextResponse.json({
      videos: data.items || [],
      nextPageToken: data.nextPageToken || null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unbekannter Fehler" }, { status: 500 })
  }
}