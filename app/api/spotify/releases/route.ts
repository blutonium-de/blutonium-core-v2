// app/api/spotify/releases/route.ts
import { NextResponse } from "next/server";
import { ARTISTS, getSpotifyToken, invalidateSpotifyToken } from "../../../../lib/spotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SpotifyImage = { url: string; width: number; height: number };
type SpotifyArtistRef = { id: string; name: string };
type SpotifyAlbum = {
  id: string;
  name: string;
  album_type: string; // "album" | "single" | "compilation" | ...
  release_date: string; // "YYYY-MM-DD" | "YYYY"
  release_date_precision: "day" | "month" | "year";
  images: SpotifyImage[];
  external_urls?: { spotify?: string };
  label?: string;
  artists?: SpotifyArtistRef[];
};

function toYear(release_date: string): number | null {
  const y = Number((release_date || "").slice(0, 4));
  return Number.isFinite(y) ? y : null;
}

function pickSquare250(images: SpotifyImage[]): string | null {
  if (!images || !images.length) return null;
  const sorted = [...images].sort((a, b) => a.width - b.width);
  const good = sorted.find((im) => im.width >= 250);
  return (good || sorted[sorted.length - 1]).url || null;
}

// Einmaliger 401-Retry (Token refresh)
async function fetchArtistAlbumsWithRetry(artistId: string): Promise<SpotifyAlbum[]> {
  let token = await getSpotifyToken();
  let url = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,compilation&limit=50&market=DE`;
  const out: SpotifyAlbum[] = [];
  let retried = false;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const j = await res.json();

    if (res.status === 401 && !retried) {
      // Token abgelaufen → neu holen und denselben Request einmal wiederholen
      console.warn("[Spotify] 401 erhalten, refreshe Token & retry …", { artistId });
      retried = true;
      invalidateSpotifyToken();
      token = await getSpotifyToken({ force: true });
      // retry denselben URL
      const res2 = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const j2 = await res2.json();
      if (!res2.ok) {
        console.error("[Spotify] retry failed", { artistId, status: res2.status, body: j2 });
        break;
      }
      const items: SpotifyAlbum[] = j2?.items || [];
      out.push(...items);
      url = j2?.next || "";
      continue;
    }

    if (!res.ok) {
      console.error("[Spotify] Fehler beim Laden der Alben", { artistId, status: res.status, body: j });
      break;
    }

    const items: SpotifyAlbum[] = j?.items || [];
    out.push(...items);
    url = j?.next || "";
  }

  return out;
}

export async function GET() {
  try {
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      console.error("[Spotify] Environment Variablen fehlen!", {
        hasID: !!process.env.SPOTIFY_CLIENT_ID,
        hasSecret: !!process.env.SPOTIFY_CLIENT_SECRET,
      });
      return NextResponse.json({ items: [], error: "Spotify-Env fehlt" }, { status: 500 });
    }

    const map = new Map<string, SpotifyAlbum>();
    for (const aid of ARTISTS) {
      if (!aid || /PLEASE_PUT/i.test(aid)) {
        console.warn("[Spotify] Überspringe Platzhalter/ungültige Artist-ID:", aid);
        continue;
      }
      const albums = await fetchArtistAlbumsWithRetry(aid);
      for (const a of albums) {
        const key = `${a.id}::${a.release_date || ""}::${a.name || ""}`;
        if (!map.has(key)) map.set(key, a);
      }
    }

    const items = Array.from(map.values())
      .map((a) => {
        const year = toYear(a.release_date);
        const artists = Array.isArray(a.artists)
          ? a.artists.map((ar) => ar.name).filter(Boolean).join(", ")
          : null;

        const rawType = (a.album_type || "").toUpperCase();
        const type =
          rawType === "ALBUM"
            ? "ALBUM"
            : rawType === "SINGLE"
            ? "SINGLE/EP"
            : rawType === "COMPILATION"
            ? "COMPILATION"
            : rawType || "RELEASE";

        return {
          id: a.id,
          title: a.name,
          type,
          year,
          releaseDate: a.release_date || null,
          artists,
          label: a.label || null,
          catalog: null as string | null,
          cover: pickSquare250(a.images),
          spotifyUrl: a.external_urls?.spotify || null,
          appleUrl: null as string | null,
          beatportUrl: null as string | null,
        };
      })
      .filter((r) => r.year);

    // Global absteigend nach Datum
    items.sort((a, b) => {
      const ad = a.releaseDate || "";
      const bd = b.releaseDate || "";
      if (ad > bd) return -1;
      if (ad < bd) return 1;
      return (a.title || "").localeCompare(b.title || "");
    });

    console.log(`[Spotify] Insgesamt ${items.length} Releases gesammelt.`);
    return NextResponse.json({ items }, { status: 200 });
  } catch (e: any) {
    console.error("/api/spotify/releases FATAL", e);
    return NextResponse.json(
      { items: [], error: e?.message || "server error" },
      { status: 500 }
    );
  }
}