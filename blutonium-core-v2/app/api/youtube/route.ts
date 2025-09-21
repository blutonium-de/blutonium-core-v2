import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.YT_API_KEY
  if(!key) return NextResponse.json({ videos: [] })
  const ch = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=@BlutoniumRecords&key=${key}`).then(r=>r.json())
  const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if(!uploads) return NextResponse.json({ videos: [] })
  const vids = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploads}&maxResults=24&key=${key}`).then(r=>r.json())
  return NextResponse.json({ videos: (vids.items||[]).map((v:any)=>({
    id: v.contentDetails.videoId,
    title: v.snippet.title,
    thumb: v.snippet.thumbnails?.medium?.url,
    publishedAt: v.contentDetails.videoPublishedAt
  })) })
}
