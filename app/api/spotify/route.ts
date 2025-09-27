// app/api/debug/spotify/route.ts
import { NextResponse } from "next/server";
import { getSpotifyToken, fetchArtists, fetchLabelReleases } from "../../../../lib/spotify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const token = await getSpotifyToken();
    const artists = await fetchArtists();
    // wir holen nur 5 Releases zur Probe (damit es schnell ist)
    const releases = (await fetchLabelReleases()).slice(0, 5);
    return NextResponse.json({
      ok: true,
      env: {
        hasId: !!process.env.SPOTIFY_CLIENT_ID,
        hasSecret: !!process.env.SPOTIFY_CLIENT_SECRET,
      },
      tokenPresent: !!token,
      artistsCount: artists.length,
      sampleReleases: releases.map(r => ({ title: r.title, year: r.year })),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}