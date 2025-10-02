// app/de/shop/dvds/page.tsx
import Image from "next/image";
import Link from "next/link";
import MoviesGridClient from "@/components/MoviesGridClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50 as const;
const HERO_SRC = "/uploads/blutonium-dvd-shop-hero.png";

const GENRES = [
  "Action","Thriller","Horror","Komödie","Drama","Sci-Fi","Romanze",
  "Familie","Animation","Dokumentation","Krimi","Fantasy","Abenteuer",
  "Krieg","Western",
] as const;

type Prod = {
  id: string;
  slug: string;
  productName?: string | null;
  artist?: string | null;
  trackTitle?: string | null;
  priceEUR: number;
  image: string;
  images?: string[];
  stock?: number | null;
  genre?: string | null;
  format?: string | null;
  categoryCode: string;
};

type SearchParams = {
  q?: string;
  genre?: string;
  type?: "all" | "dvd" | "bray";
};

function buildQuery(next: Record<string, string | undefined>, cur: URLSearchParams) {
  const s = new URLSearchParams(cur);
  Object.entries(next).forEach(([k, v]) => {
    if (v == null || v === "") s.delete(k);
    else s.set(k, v);
  });
  return `?${s.toString()}`;
}

async function fetchInitial(params: {
  q?: string;
  genre?: string;
  type: "all" | "dvd" | "bray";
}) {
  const base =
    (typeof window === "undefined" ? process.env.NEXT_PUBLIC_BASE_URL : window.location.origin) || "";
  const qs = new URLSearchParams();
  const cat =
    params.type === "dvd" ? "dvd" :
    params.type === "bray" ? "bray" :
    "dvd,bray";
  qs.set("limit", String(PAGE_SIZE));
  qs.set("offset", "0");
  qs.set("cat", cat);
  if (params.q) qs.set("q", params.q);
  if (params.genre) qs.set("genre", params.genre);

  const res = await fetch(`${base}/api/products?${qs.toString()}`, { cache: "no-store" });
  const text = await res.text();
  let j: any; try { j = JSON.parse(text); } catch { j = text; }
  if (!res.ok) throw new Error((j && j.error) || "Fehler beim Laden");
  const items: Prod[] = Array.isArray(j?.items) ? j.items : Array.isArray(j) ? j : [];
  return items;
}

export default async function DVDsPage({ searchParams }: { searchParams: SearchParams }) {
  const q     = (searchParams?.q || "").trim();
  const genre = (searchParams?.genre || "").trim();
  const type: "all" | "dvd" | "bray" =
    searchParams?.type === "dvd" ? "dvd" :
    searchParams?.type === "bray" ? "bray" : "all";

  const initial = await fetchInitial({ q, genre, type });

  const cur = new URLSearchParams();
  if (q) cur.set("q", q);
  if (genre) cur.set("genre", genre);
  if (type !== "all") cur.set("type", type);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 md:gap-6 items-center">
          <div className="p-6 md:p-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold">Gebrauchte Filme</h1>
            <p className="mt-2 text-white/80">
              DVDs &amp; Blu-rays: geprüft, fair bepreist, schnell versendet.
            </p>

            {/* Tabs */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link
                href={buildQuery({ type: undefined }, cur)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition ${
                  type === "all"
                    ? "border-cyan-400 bg-cyan-400/10 text-cyan-200"
                    : "border-white/15 bg-white/5 hover:bg-white/10"
                }`}
              >
                Alle
              </Link>
              <Link
                href={buildQuery({ type: "dvd" }, cur)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition ${
                  type === "dvd"
                    ? "border-cyan-400 bg-cyan-400/10 text-cyan-200"
                    : "border-white/15 bg-white/5 hover:bg-white/10"
                }`}
              >
                DVDs
              </Link>
              <Link
                href={buildQuery({ type: "bray" }, cur)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition ${
                  type === "bray"
                    ? "border-cyan-400 bg-cyan-400/10 text-cyan-200"
                    : "border-white/15 bg-white/5 hover:bg-white/10"
                }`}
              >
                Blu-rays
              </Link>
            </div>

            {/* Suche */}
            <form className="mt-5 flex gap-2" action="">
              <input
                type="search"
                name="q"
                placeholder="Suchen (Titel, Regie, EAN …)"
                defaultValue={q}
                className="flex-1 rounded-lg px-3 py-2 bg-white/5 border border-white/10"
              />
              <input type="hidden" name="genre" value={genre} />
              <input type="hidden" name="type" value={type} />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
              >
                Suchen
              </button>
            </form>

            {/* Promo-Zeile */}
            <div className="mt-3 text-[13px] text-white/70">
              Tipp: Nutze die Genre-Buttons, um schneller zu filtern.
            </div>
          </div>

          {/* Hero Bild (Logo oben rechts) */}
          <div className="relative h-44 md:h-full">
            <Image
              src={HERO_SRC}
              alt="Blutonium – DVDs & Blu-rays"
              fill
              className="object-contain p-4 md:p-6"
              priority
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
        </div>
      </div>

      {/* Genre-Filter */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-sm opacity-70 mr-1">Genre:</span>
        <Link
          href={buildQuery({ genre: undefined }, cur)}
          className={`px-2.5 py-1 rounded border text-xs ${
            !genre ? "border-cyan-400 text-cyan-200 bg-cyan-400/10" : "border-white/15 hover:bg-white/10"
          }`}
        >
          Alle Genres
        </Link>
        {GENRES.map((g) => (
          <Link
            key={g}
            href={buildQuery({ genre: g }, cur)}
            className={`px-2.5 py-1 rounded border text-xs ${
              genre === g ? "border-cyan-400 text-cyan-200 bg-cyan-400/10" : "border-white/15 hover:bg-white/10"
            }`}
          >
            {g}
          </Link>
        ))}
      </div>

      {/* Grid + Load More */}
      <MoviesGridClient initial={initial} q={q || ""} genre={genre || ""} type={type} />
    </div>
  );
}