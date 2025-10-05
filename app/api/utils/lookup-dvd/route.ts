// app/api/utils/lookup-dvd/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Nur Ziffern behalten, EAN/UPC auf 8–14 Stellen begrenzen */
function normalizeBarcode(v: string | null): string {
  const d = (v || "").replace(/\D+/g, "");
  if (d.length < 8 || d.length > 14) return "";
  return d;
}

/** Heuristik für Format/Kategorie */
function detectFormatAndCategory(from?: string | null) {
  const s = (from || "").toLowerCase();
  const looksBlu = /blu[- ]?ray|bluray|bray/.test(s);
  return {
    format: looksBlu ? "Blu-ray" : "DVD",
    categoryCode: looksBlu ? "bray" : "dvd",
  };
}

// ---- TMDb Helpers ----------------------------------------------------------
const TMDB_KEY = process.env.TMDB_KEY || "";
const TMDB_LANG = process.env.TMDB_LANG || "de-DE";
const TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w500";

/** Suche Film auf TMDb nach Titel(+Jahr) und hole Details + Credits */
async function fetchFromTmdbByTitle(title: string, year?: number) {
  if (!TMDB_KEY) return null;

  const qs = new URLSearchParams({
    api_key: TMDB_KEY,
    language: TMDB_LANG,
    include_adult: "false",
    query: title,
  });
  if (year) qs.set("year", String(year));

  const searchUrl = `https://api.themoviedb.org/3/search/movie?${qs.toString()}`;
  const r = await fetch(searchUrl, { cache: "no-store" });
  const j = await r.json().catch(() => ({} as any));

  const result = Array.isArray(j?.results) && j.results[0] ? j.results[0] : null;
  if (!r.ok || !result) return null;

  // Details (für Genres) & Credits (für Director)
  const [detailsRes, creditsRes] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/movie/${result.id}?api_key=${TMDB_KEY}&language=${TMDB_LANG}`, { cache: "no-store" }),
    fetch(`https://api.themoviedb.org/3/movie/${result.id}/credits?api_key=${TMDB_KEY}&language=${TMDB_LANG}`, { cache: "no-store" }),
  ]);

  const details = await detailsRes.json().catch(() => ({} as any));
  const credits = await creditsRes.json().catch(() => ({} as any));

  const director = Array.isArray(credits?.crew)
    ? (credits.crew.find((c: any) => (c?.job || "").toLowerCase() === "director")?.name || null)
    : null;

  const genreName = Array.isArray(details?.genres) && details.genres[0]
    ? details.genres[0].name
    : null;

  const poster = result.poster_path ? `${TMDB_IMG_BASE}${result.poster_path}` : null;

  return {
    title: result.title || result.original_title || title,
    year: (result.release_date ? Number(result.release_date.slice(0, 4)) : undefined) || year || null,
    director,
    genre: genreName,
    cover: poster,
    // Format/Kategorie kann TMDb nicht sicher sagen → Heuristik:
    ...detectFormatAndCategory(result.title || ""),
    source: "tmdb",
  };
}

/** Optional: UPCItemDB → Titel/Jahr aus EAN (nur wenn KEY gesetzt) */
async function fetchFromUpcItemDb(ean: string) {
  const UPC_KEY = process.env.UPCITEMDB_KEY || "";
  if (!UPC_KEY) return null;

  try {
    const r = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(ean)}`,
      { headers: { "Content-Type": "application/json" }, cache: "no-store" }
    );
    const j = await r.json().catch(() => ({} as any));
    const item = Array.isArray(j?.items) && j.items[0] ? j.items[0] : null;
    if (!r.ok || !item) return null;

    const title = item.title || item.description || null;
    // Jahr ist dort meist nicht zuverlässig -> lassen wir leer
    const { format, categoryCode } = detectFormatAndCategory(
      [item.title, item.brand, item.category].filter(Boolean).join(" ")
    );
    const image = (Array.isArray(item.images) && item.images[0]) || null;

    return {
      title,
      year: null as number | null,
      director: null as string | null,
      genre: null as string | null,
      cover: image,
      format,
      categoryCode,
      source: "upcitemdb",
    };
  } catch {
    return null;
  }
}

// ---- Route -----------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const code = normalizeBarcode(req.nextUrl.searchParams.get("barcode"));
    if (!code) {
      return NextResponse.json({ error: "invalid barcode" }, { status: 400 });
    }

    // 1) Lokale DB zuerst
    const meta = await prisma.dvdMeta.findUnique({ where: { ean: code } });
    if (meta) {
      const { format, categoryCode } = detectFormatAndCategory(meta.format || meta.title || "");
      return NextResponse.json({
        source: "dvdmeta",
        ean: code,
        title: meta.title || null,
        year: meta.year || null,
        director: meta.director || null,
        genre: meta.genre || null,
        edition: meta.edition || null,
        cover: meta.cover || null,
        format,
        categoryCode,
        fsk: null,
      });
    }

    // 2) UPC → Titel -> 3) TMDb
    const fromUpc = await fetchFromUpcItemDb(code);

    if (fromUpc?.title) {
      // Mit dem Titel (und ggf. Jahr) TMDb anfragen
      const fromTmdb = await fetchFromTmdbByTitle(fromUpc.title, fromUpc.year ?? undefined);
      if (fromTmdb) {
        return NextResponse.json({
          ean: code,
          ...fromTmdb,
        });
      }
      // Falls TMDb nichts liefert, nimm wenigstens UPC-Daten
      return NextResponse.json({
        ean: code,
        ...fromUpc,
      });
    }

    // 3) Nichts gefunden
    return NextResponse.json({ error: "no dvd metadata found" }, { status: 404 });
  } catch (e) {
    console.error("[lookup-dvd]", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}