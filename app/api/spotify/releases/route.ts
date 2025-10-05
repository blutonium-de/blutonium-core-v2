// app/api/spotify/releases/route.ts
import { NextResponse } from "next/server";
import { ARTISTS, getSpotifyToken } from "../../../../lib/spotify";

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

// *** HIER Labels/Queries pflegen – ergänzt Compilations (Various Artists etc.) ***
const LABEL_QUERIES: string[] = [
  'label:"Blutonium Records"',
  'label:"Blutonium Traxx"',
  // weitere Label-/Seriennamen möglich, z. B.:
  // 'label:"DJ Session"', 'label:"Harddance"', ...
];

const MARKET = "DE"; // oder "AT" – Markt beeinflusst Verfügbarkeit/Sortierung

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

async function fetchAllAlbumsForArtist(
  token: string,
  artistId: string
): Promise<SpotifyAlbum[]> {
  const out: SpotifyAlbum[] = [];
  let url = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,compilation&limit=50&market=${MARKET}`;
  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const j = await res.json();
    if (!res.ok) {
      console.error("[Spotify] Fehler beim Laden der Alben", {
        artistId,
        status: res.status,
        body: j,
      });
      break;
    }
    const items: SpotifyAlbum[] = j?.items || [];
    out.push(...items);
    url = j?.next || "";
  }
  return out;
}

async function fetchAlbumsBySearch(token: string, query: string): Promise<SpotifyAlbum[]> {
  const out: SpotifyAlbum[] = [];
  let url = `https://api.spotify.com/v1/search?type=album&limit=50&market=${MARKET}&q=${encodeURIComponent(
    query
  )}`;
  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const j = await res.json();
    if (!res.ok) {
      console.error("[Spotify] Fehler bei der Label-Suche", {
        query,
        status: res.status,
        body: j,
      });
      break;
    }
    const items: SpotifyAlbum[] = j?.albums?.items || [];
    out.push(...items);
    url = j?.albums?.next || "";
  }
  return out;
}

export async function GET() {
  try {
    const token = await getSpotifyToken();

    // Sammeln & deduplizieren
    const map = new Map<string, SpotifyAlbum>();

    // 1) Künstler-basierte Releases
    for (const aid of ARTISTS) {
      if (!aid || /PLEASE_PUT/i.test(aid)) continue;
      const albums = await fetchAllAlbumsForArtist(token, aid);
      for (const a of albums) {
        const key = a.id || `${a.name || ""}::${a.release_date || ""}`;
        if (!map.has(key)) map.set(key, a);
      }
    }

    // 2) Label-Suchen (holt Compilations/Various Artists)
    for (const q of LABEL_QUERIES) {
      const albums = await fetchAlbumsBySearch(token, q);
      for (const a of albums) {
        const key = a.id || `${a.name || ""}::${a.release_date || ""}`;
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

    // Neueste zuerst (nach Datum, dann Titel)
    items.sort((a, b) => {
      const ad = a.releaseDate || "";
      const bd = b.releaseDate || "";
      if (ad > bd) return -1;
      if (ad < bd) return 1;
      return (a.title || "").localeCompare(b.title || "");
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch (e: any) {
    console.error("/api/spotify/releases error:", e);
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 }
    );
  }
}