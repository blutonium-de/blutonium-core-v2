// app/api/utils/lookup/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Einheitliches Ergebnis */
type LookupResult = {
  artist?: string | null;
  title?: string | null;
  format?: string | null;
  year?: number | null;
  catno?: string | null;
  cover?: string | null;
  source?: "discogs" | "musicbrainz" | "itunes";
};

function toYear(s?: string | null): number | null {
  if (!s) return null;
  const y = Number(String(s).slice(0, 4));
  return Number.isFinite(y) ? y : null;
}

/** 1) Discogs by barcode (braucht DISCOGS_TOKEN) */
async function fetchDiscogs(barcode: string): Promise<LookupResult | null> {
  const token = process.env.DISCOGS_TOKEN || process.env.NEXT_PUBLIC_DISCOGS_TOKEN;
  if (!token) return null;

  const url = `https://api.discogs.com/database/search?type=release&per_page=5&barcode=${encodeURIComponent(
    barcode
  )}&token=${encodeURIComponent(token)}`;

  const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Blutonium/1.0 +admin" } });
  if (!res.ok) return null;
  const j = await res.json();

  const first = Array.isArray(j?.results) ? j.results[0] : null;
  if (!first) return null;

  // Discogs liefert oft "Artist - Title" in title
  let artist: string | null = null;
  let title: string | null = first?.title || null;
  if (title && title.includes(" - ")) {
    const [a, t] = title.split(" - ");
    if (a && t) {
      artist = a.trim();
      title = t.trim();
    }
  } else if (Array.isArray(first?.artist)) {
    artist = String(first.artist[0]);
  } else if (first?.artist) {
    artist = String(first.artist);
  }

  const cover =
    first?.cover_image ||
    (Array.isArray(first?.images) && first.images[0]?.uri) ||
    null;

  const catno =
    (Array.isArray(first?.catno) && first.catno[0]) ||
    (Array.isArray(first?.label) && first.label[0]) || // label-String enthält mitunter "Label – CatNo"
    first?.catno ||
    null;

  const fmt =
    (Array.isArray(first?.format) ? first.format.join(", ") : first?.format) ||
    (Array.isArray(first?.format) ? first.format[0] : null) ||
    null;

  return {
    artist,
    title,
    format: fmt,
    year: toYear(first?.year),
    catno,
    cover,
    source: "discogs",
  };
}

/** 2) MusicBrainz by barcode (+ Cover via CoverArtArchive) */
async function fetchMusicBrainz(barcode: string): Promise<LookupResult | null> {
  // direkte Barcode-Route ist am zuverlässigsten:
  const url = `https://musicbrainz.org/ws/2/release?barcode=${encodeURIComponent(
    barcode
  )}&fmt=json&inc=artist-credits+labels+release-groups`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Blutonium/1.0 (admin lookup)",
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const j = await res.json();

  const rel = Array.isArray(j?.releases) ? j.releases[0] : null;
  if (!rel) return null;

  const artist =
    Array.isArray(rel["artist-credit"]) && rel["artist-credit"][0]?.name
      ? rel["artist-credit"].map((ac: any) => ac?.name).filter(Boolean).join(", ")
      : rel?.artist || null;

  const title: string | null = rel?.title || null;
  const year = toYear(rel?.date);

  // Label/CatNo
  let catno: string | null = null;
  if (Array.isArray(rel["label-info"]) && rel["label-info"][0]) {
    catno = rel["label-info"][0]["catalog-number"] || null;
  }

  // Format aus release-group?
  let format: string | null = null;
  const prim = rel?.["release-group"]?.["primary-type"];
  const sec = Array.isArray(rel?.["release-group"]?.["secondary-types"])
    ? rel["release-group"]["secondary-types"].join(", ")
    : null;
  format = [prim, sec].filter(Boolean).join(" / ") || null;

  // Cover: CoverArtArchive
  let cover: string | null = null;
  if (rel?.id) {
    const cov = await fetch(`https://coverartarchive.org/release/${rel.id}/front-250`, {
      cache: "no-store",
      headers: { "User-Agent": "Blutonium/1.0 (admin lookup)" },
    });
    if (cov.ok) {
      // Direktlink auf das gerenderte Front-Cover (250px). Fällt zurück, wenn nicht vorhanden.
      cover = cov.url; // bei 200 ist das die Bild-URL
    }
  }

  return {
    artist,
    title,
    format,
    year,
    catno,
    cover,
    source: "musicbrainz",
  };
}

/** 3) iTunes (schwacher Fallback, findet selten über blanke Zahl) */
async function fetchITunes(term: string): Promise<LookupResult | null> {
  const url = `https://itunes.apple.com/search?media=music&limit=10&term=${encodeURIComponent(term)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const j = await res.json();
  const r = Array.isArray(j?.results) ? j.results[0] : null;
  if (!r) return null;
  return {
    artist: r?.artistName || null,
    title: r?.collectionName || r?.trackName || null,
    format: r?.collectionType || null,
    year: toYear(r?.releaseDate),
    catno: null,
    cover: r?.artworkUrl100?.replace("100x100bb", "300x300bb") || null,
    source: "itunes",
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const barcode = (searchParams.get("barcode") || "").trim();

  if (!barcode) {
    return NextResponse.json({ error: "barcode required" }, { status: 400 });
  }

  try {
    // 1) Discogs
    const d = await fetchDiscogs(barcode);
    if (d) return NextResponse.json(d, { status: 200 });

    // 2) MusicBrainz
    const m = await fetchMusicBrainz(barcode);
    if (m) return NextResponse.json(m, { status: 200 });

    // 3) iTunes (Last Resort)
    const i = await fetchITunes(barcode);
    if (i) return NextResponse.json(i, { status: 200 });

    return NextResponse.json({ error: "not_found" }, { status: 404 });
  } catch (e: any) {
    console.error("[lookup] error", e);
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}