// app/api/spotify/artists/route.ts
import { NextResponse } from "next/server";
// RELATIVE import – kein @/...
import { ARTISTS, getSpotifyToken } from "../../../../lib/spotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ArtistItem = {
  id: string;
  name: string;
  followers?: number | null;
  genre?: string | null;
  photo?: string | null;
  spotifyUrl?: string | null;
  appleUrl?: string | null;   // leer
  beatportUrl?: string | null;// leer
};

export async function GET() {
  try {
    const token = await getSpotifyToken();

    if (!Array.isArray(ARTISTS) || ARTISTS.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Spotify erlaubt mehrere IDs via /v1/artists?ids=...
    const chunkSize = 50;
    const chunks: string[][] = [];
    for (let i = 0; i < ARTISTS.length; i += chunkSize) {
      chunks.push(ARTISTS.slice(i, i + chunkSize));
    }

    const all: ArtistItem[] = [];
    for (const ids of chunks) {
      const url = `https://api.spotify.com/v1/artists?ids=${ids.join(",")}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json();
      if (!r.ok) {
        console.error("Spotify artists error:", j);
        continue;
      }
      const arr = (j?.artists || []) as any[];
      for (const a of arr) {
        const followers = a?.followers?.total ?? null;
        const genre = Array.isArray(a?.genres) && a.genres.length ? a.genres[0] : null;
        const photo = a?.images?.[0]?.url ?? null;
        const spotifyUrl = a?.external_urls?.spotify ?? null;
        all.push({
          id: a?.id,
          name: a?.name ?? "",
          followers: typeof followers === "number" ? followers : null,
          genre,
          photo,
          spotifyUrl,
          appleUrl: null,
          beatportUrl: null,
        });
      }
    }

    // Sortiere z.B. nach Name, alternativ Followers
    all.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ items: all });
  } catch (e: any) {
    console.error("/api/spotify/artists error:", e);
    return NextResponse.json({ items: [] });
  }
}