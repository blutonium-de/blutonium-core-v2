// app/api/utils/discogs/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const barcode = (req.nextUrl.searchParams.get("barcode") || "").trim();
  const token = process.env.DISCOGS_TOKEN;

  if (!barcode) return NextResponse.json({ error: "barcode required" }, { status: 400 });
  if (!token)  return NextResponse.json({ error: "Missing DISCOGS_TOKEN" }, { status: 500 });

  const discogsHeaders = { "User-Agent": "BlutoniumShop/1.0 (+https://blutonium.de)" };

  // ---------- 1) Discogs: gezielte Barcode-Suche ----------
  try {
    const url = `https://api.discogs.com/database/search?barcode=${encodeURIComponent(
      barcode
    )}&type=release&per_page=10&page=1&token=${token}`;

    const r = await fetch(url, { headers: discogsHeaders, cache: "no-store" });
    if (r.ok) {
      const j: any = await r.json();
      const items: any[] = Array.isArray(j?.results) ? j.results : [];
      const best = items
        .filter(Boolean)
        .sort((a, b) => Number(!!b.cover_image) - Number(!!a.cover_image))[0];

      if (best) {
        const { title = "", year = null, format, cover_image, thumb, label, catno } = best;
        const split = String(title).split(" - ");
        let artist = "", track = title;
        if (split.length >= 2) {
          artist = split[0].trim();
          track = split.slice(1).join(" - ").trim();
        }

        return NextResponse.json({
          source: "discogs",
          artist,
          title: track,
          year,
          format: Array.isArray(format) ? format.join(", ") : (format || ""),
          cover: cover_image || thumb || null,
          label: Array.isArray(label) ? label[0] : (label || ""),
          catno: catno || "",
        });
      }
    }
  } catch {
    // still zulassen → Fallbacks
  }

  // ---------- 2) Discogs-Fallback: generische Query ----------
  try {
    const qUrl = `https://api.discogs.com/database/search?q=${encodeURIComponent(
      barcode
    )}&type=release&per_page=10&page=1&token=${token}`;
    const r2 = await fetch(qUrl, { headers: discogsHeaders, cache: "no-store" });
    if (r2.ok) {
      const j2: any = await r2.json();
      const items2: any[] = Array.isArray(j2?.results) ? j2.results : [];
      const best2 = items2
        .filter(Boolean)
        .sort((a, b) => Number(!!b.cover_image) - Number(!!a.cover_image))[0];

      if (best2) {
        const { title = "", year = null, format, cover_image, thumb, label, catno } = best2;
        const split = String(title).split(" - ");
        let artist = "", track = title;
        if (split.length >= 2) {
          artist = split[0].trim();
          track = split.slice(1).join(" - ").trim();
        }

        return NextResponse.json({
          source: "discogs-query",
          artist,
          title: track,
          year,
          format: Array.isArray(format) ? format.join(", ") : (format || ""),
          cover: cover_image || thumb || null,
          label: Array.isArray(label) ? label[0] : (label || ""),
          catno: catno || "",
        });
      }
    }
  } catch {
    // weiter zu MusicBrainz
  }

  // ---------- 3) MusicBrainz: Barcode-Suche + Cover (Cover Art Archive) ----------
  try {
    // Variante A: ?barcode=…
    let mb = await fetch(
      `https://musicbrainz.org/ws/2/release/?barcode=${encodeURIComponent(barcode)}&fmt=json`,
      { headers: { "User-Agent": "BlutoniumShop/1.0" }, cache: "no-store" }
    );
    if (!mb.ok) {
      // Variante B: Query
      mb = await fetch(
        `https://musicbrainz.org/ws/2/release/?query=barcode:${encodeURIComponent(barcode)}&fmt=json`,
        { headers: { "User-Agent": "BlutoniumShop/1.0" }, cache: "no-store" }
      );
    }
    if (mb.ok) {
      const data: any = await mb.json();
      const rel = Array.isArray(data?.releases) ? data.releases[0] : null;
      if (rel) {
        const title = rel.title || "";
        const ac = Array.isArray(rel["artist-credit"]) ? rel["artist-credit"] : [];
        const artist = ac.map((p: any) => p?.name || p?.artist?.name).filter(Boolean).join(", ");
        const year = rel["date"] ? Number(String(rel["date"]).slice(0,4)) : null;
        const format = Array.isArray(rel["medium-list"])
          ? rel["medium-list"].map((m: any) => m?.format).filter(Boolean).join(", ")
          : "";

        // Cover Art Archive versuchen
        let cover: string | null = null;
        if (rel.id) {
          try {
            const ca = await fetch(
              `https://coverartarchive.org/release/${encodeURIComponent(rel.id)}`,
              { headers: { "User-Agent": "BlutoniumShop/1.0" }, cache: "no-store" }
            );
            if (ca.ok) {
              const cj: any = await ca.json();
              const img = Array.isArray(cj?.images) ? cj.images.find((x: any) => x?.front) || cj.images[0] : null;
              cover = img?.thumbnails?.large || img?.thumbnails?.small || img?.image || null;
            }
          } catch {
            // kein Cover verfügbar → null
          }
        }

        const label =
          Array.isArray(rel["label-info-list"]) ? rel["label-info-list"][0]?.label?.name || "" : "";
        const catno =
          Array.isArray(rel["label-info-list"]) ? rel["label-info-list"][0]?.catalogNumber || "" : "";

        return NextResponse.json({
          source: "musicbrainz",
          artist,
          title,
          year,
          format,
          cover,
          label,
          catno,
        });
      }
    }
  } catch {
    // ignorieren
  }

  return NextResponse.json({ error: "Keine Treffer" }, { status: 404 });
}