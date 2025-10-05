// app/de/shop/page.tsx
import Image from "next/image";
import Link from "next/link";
import { FREE_SHIPPING_EUR } from "../../../lib/shop-config";
import ShopGridClient from "../../../components/ShopGridClient";

export const dynamic = "force-dynamic";

type Prod = {
  id: string;
  slug: string;
  artist?: string | null;
  trackTitle?: string | null;
  productName?: string | null;
  subtitle?: string | null;
  categoryCode: string;
  condition?: string | null;
  priceEUR: number;
  image: string;
  images?: string[];
  stock?: number | null;
  genre?: string | null;
  format?: string | null;
};

const GENRES = [
  "Hardstyle","Techno","Trance","House","Reggae","Pop","Film",
  "Dance","Hörspiel","Jazz","Klassik","Country",
  "Italo Disco","Disco","EDM","Hip Hop",
] as const;

const CATS = [
  { code: "",    label: "Alle" },
  { code: "bv",  label: "Blutonium Vinyls" },
  { code: "sv",  label: "Sonstige Vinyls" },
  { code: "bcd", label: "Blutonium CDs" },
  { code: "scd", label: "Sonstige CDs" },
  { code: "bhs", label: "Blutonium Hardstyle Samples" },
  { code: "ss",  label: "Sonstiges & Specials" },
];

function abs(path: string) {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
  return new URL(path, base + "/").toString();
}

function buildQuery(next: Record<string, string | undefined>, cur: URLSearchParams) {
  const s = new URLSearchParams(cur);
  Object.entries(next).forEach(([k, v]) => {
    if (v == null || v === "") s.delete(k);
    else s.set(k, v);
  });
  return `?${s.toString()}`;
}

async function fetchInitial(params: { q?: string; genre?: string; cat?: string }) {
  const qs = new URLSearchParams();
  // Vinyl/CD only – KEINE dvd/bray
  qs.set("cat", params.cat ? params.cat : "bv,sv,bcd,scd,bhs,ss");
  qs.set("limit", "50");
  qs.set("offset", "0");
  if (params.q) qs.set("q", params.q);
  if (params.genre) qs.set("genre", params.genre);

  const res = await fetch(abs(`/api/public/products?${qs.toString()}`), { cache: "no-store" });
  const text = await res.text();
  let j: any; try { j = JSON.parse(text); } catch { j = text; }
  if (!res.ok) throw new Error((j && j.error) || "Fehler beim Laden");
  const items: Prod[] = Array.isArray(j?.items) ? j.items : [];
  return items;
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams?: { q?: string; genre?: string; cat?: string };
}) {
  const q     = (searchParams?.q || "").trim();
  const genre = (searchParams?.genre || "").trim();
  const cat   = (searchParams?.cat || "").trim(); // leer = Alle

  const cur = new URLSearchParams();
  if (q) cur.set("q", q);
  if (genre) cur.set("genre", genre);
  if (cat) cur.set("cat", cat);

  const initial = await fetchInitial({ q, genre, cat });

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Hero – im Stil der DVD-Seite */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 md:gap-6 items-center">
          <div className="p-6 md:p-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold">Blutonium Records Online Shop</h1>
            <p className="mt-2 text-white/80">
              Gebrauchte Vinyls! 12&quot; Maxi Singles, Compilations, Alben, Maxi CDs und div. Specials zum fairen Preis.
            </p>

            <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-3 py-1.5 text-emerald-200 text-sm">
              <span aria-hidden>🚚</span>
              <span>
                <strong>Versandkostenfrei ab {FREE_SHIPPING_EUR.toFixed(0)} €</strong> (AT & EU) – wird im Checkout automatisch berücksichtigt.
              </span>
            </div>

            {/* Suche */}
            <form className="mt-5 flex gap-2" action="">
              <input
                type="search"
                name="q"
                placeholder="Suchen (Artist, Titel, EAN, Katalog …)"
                defaultValue={q}
                className="flex-1 rounded-lg px-3 py-2 bg-white/5 border border-white/10"
              />
              <input type="hidden" name="genre" value={genre} />
              <input type="hidden" name="cat" value={cat} />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
              >
                Suchen
              </button>
            </form>

            <div className="mt-3 text-[13px] text-white/70">
              Tipp: Nutze die Genre-Buttons, um schneller zu filtern.
            </div>
          </div>

          {/* rechtes Logo */}
          <div className="relative h-56 md:h-72 lg:h-80 grid place-items-center p-6">
            <img
              src="/blutonium-records-shop-logo.png"
              alt="Blutonium Records Shop"
              className="max-h-64 w-auto object-contain"
              loading="eager"
            />
          </div>
        </div>
      </div>

      {/* Genre-Filter */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
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

      {/* Kategorien */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {CATS.map((c) => (
          <Link
            key={c.code || "all"}
            href={buildQuery({ cat: c.code || undefined }, cur)}
            className={`px-3 py-1.5 rounded-lg border text-sm transition ${
              (c.code || "") === (cat || "")
                ? "border-cyan-400 bg-cyan-400/10 text-cyan-200"
                : "border-white/15 bg-white/5 hover:bg-white/10"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      <ShopGridClient
        key={`${q}|${genre}|${cat}`}
        initial={initial}
        q={q}
        genre={genre}
        cat={cat}
      />
    </div>
  );
}