// components/DVDCard.tsx
"use client";
import Link from "next/link";

type DVD = {
  id: string;
  slug: string;
  title: string;
  priceEUR: number;
  image: string;
  stock?: number | null;
  genre?: string | null;
  format?: string | null; // "DVD" | "Blu-ray"
  fsk?: string | null;    // z.B. "FSK 16"
};

function fskNum(fsk?: string | null) {
  if (!fsk) return null;
  const m = String(fsk).match(/(\d{1,2})/);
  return m ? m[1] : null;
}

/** Gibt einen Icon-Pfad zurück. Lege die Dateien so ab:
 * /public/fsk/fsk-0.png, -6.png, -12.png, -16.png, -18.png
 * (SVG geht auch: gleiche Namen, nur .svg)
 */
function fskIconSrc(fsk?: string | null) {
  const n = fskNum(fsk);
  if (!n) return null;
  // bevorzugt SVG, sonst PNG
  return {
    svg: `/fsk/fsk-${n}.svg`,
    png: `/fsk/fsk-${n}.png`,
    alt: `FSK ${n}`,
  };
}

export default function DVDCard({ dvd }: { dvd: DVD }) {
  const soldOut = (dvd.stock ?? 0) <= 0;
  const icon = fskIconSrc(dvd.fsk);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.08] transition p-3 w-[180px]">
      <Link
        href={`/de/dvds/${dvd.slug}`}
        className="block relative w-full aspect-[2/3] overflow-hidden rounded-xl"
        title={dvd.title}
      >
        {/* Cover – schlanker (2:3), randlos */}
        <img
          src={dvd.image || "/placeholder-dvd.png"}
          alt={dvd.title}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />

        {soldOut && (
          <div className="absolute top-2 left-2 bg-red-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded">
            Ausverkauft
          </div>
        )}
      </Link>

      <div className="mt-2 text-[15px] font-semibold leading-snug line-clamp-2 min-h-[2.6em]">
        {dvd.title}
      </div>

      <div className="text-[11px] opacity-70">
        {(dvd.genre?.trim() || "—") + " · " + (dvd.format?.trim() || "DVD")}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="font-semibold text-sm">{dvd.priceEUR.toFixed(2)} €</span>

        {/* FSK rechts neben Preis – klein & dezent */}
        {icon ? (
          <picture>
            <source srcSet={icon.svg} type="image/svg+xml" />
            <img
              src={icon.png}
              alt={icon.alt}
              className="h-5 w-5 rounded"
              loading="lazy"
              aria-hidden="true"
            />
          </picture>
        ) : (
          <span />
        )}
      </div>

      <div className="mt-1 flex items-center justify-between">
        {soldOut ? (
          <span className="text-xs opacity-50">Nicht verfügbar</span>
        ) : (
          <Link
            href={`/de/dvds/${dvd.slug}`}
            className="bg-cyan-500 hover:bg-cyan-400 text-black text-xs px-2 py-1 rounded font-semibold"
          >
            In den Warenkorb
          </Link>
        )}
        <span className="text-[11px] opacity-70">
          {soldOut ? "" : `Lagerbestand: ${dvd.stock ?? 1}`}
        </span>
      </div>
    </div>
  );
}