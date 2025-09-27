// app/api/lookup/route.ts
import { NextRequest, NextResponse } from "next/server";

// Hilfsfunktionen
function yearFromDate(d?: string | null) {
  if (!d) return null;
  const m = String(d).match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

async function tryDiscogs(barcode: string) {
  const token = process.env.DISCOGS_TOKEN;
  if (!token) return null;

  const url = `https://api.discogs.com/database/search?barcode=${encodeURIComponent(
    barcode
  )}&type=release&per_page=1&page=1&token=${token}`;

  const r = await fetch(url, {
    headers: { "User-Agent": "BlutoniumShop/1.0 (+https://blutonium.de)" },
    cache: "no-store",
  });
  if (!r.ok) return null;

  const j = await r.json();
  const item = j?.results?.[0];
  if (!item) return null;

  let artist = "";
  let title = "";
  if (item.title) {
    const split = String(item.title).split(" - ");
    if (split.length >= 2) {
      artist = split[0];
      title = split.slice(1).join(" - ");
    } else {
      title = item.title;
    }
  }

  return {
    source: "discogs",
    artist,
    title,
    year: item.year || null,
    format: Array.isArray(item.format) ? item.format.join(", ") : item.format || "",
    cover: item.cover_image || item.thumb || null,
    label: Array.isArray(item.label) ? item.label[0] : item.label || "",
    catno: item.catno || "",
  };
}

async function tryMusicBrainz(barcode: string) {
  const url = `https://musicbrainz.org/ws/2/release/?query=barcode:${encodeURIComponent(
    barcode
  )}&fmt=json&limit=1`;

  const r = await fetch(url, {
    headers: { "User-Agent": "BlutoniumShop/1.0 (+https://blutonium.de)" },
    cache: "no-store",
  });
  if (!r.ok) return null;

  const j = await r.json();
  const rel = j?.releases?.[0];
  if (!rel) return null;

  let artist = "";
  if (Array.isArray(rel["artist-credit"])) {
    artist = rel["artist-credit"].map((ac: any) => ac.name).join(", ");
  }

  let label = "";
  let catno = "";
  if (Array.isArray(rel["label-info"]) && rel["label-info"][0]) {
    label = rel["label-info"][0]?.label?.name || "";
    catno = rel["label-info"][0]?.["catalog-number"] || "";
  }

  let cover: string | null = null;
  if (rel.id) {
    const coverUrl = `https://coverartarchive.org/release/${rel.id}/front-500`;
    const cr = await fetch(coverUrl, { method: "HEAD" });
    if (cr.ok) cover = coverUrl;
  }

  let format = "";
  if (Array.isArray(rel.media) && rel.media[0]?.format) {
    format = rel.media[0].format;
  }

  return {
    source: "musicbrainz",
    artist,
    title: rel.title || "",
    year: yearFromDate(rel.date) || null,
    format,
    cover,
    label,
    catno,
  };
}

export async function GET(req: NextRequest) {
  const barcode = req.nextUrl.searchParams.get("barcode") || "";
  if (!barcode) return NextResponse.json({ error: "barcode required" }, { status: 400 });

  const d = await tryDiscogs(barcode);
  if (d) return NextResponse.json(d);

  const m = await tryMusicBrainz(barcode);
  if (m) return NextResponse.json(m);

  return NextResponse.json({ error: "Kein Treffer bei Discogs/MusicBrainz" }, { status: 404 });
}