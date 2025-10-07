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
  fsk?: string | number | null; // Zahl oder String
};

function parseFsk(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  const m = String(v).match(/\d{1,2}/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  return [0, 6, 12, 16, 18].includes(n) ? n : null;
}

export default function DVDCard({ dvd }: { dvd: DVD }) {
  const soldOut = (dvd.stock ?? 0) <= 0;
  const fsk = parseFsk(dvd.fsk);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.08] transition p-3 w-[180px]">
      <Link
        href={`/de/dvds/${dvd.slug}`}
        className="block relative w-full aspect-[2/3] overflow-hidden rounded-xl"
        title={dvd.title}
      >
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
        {/* FSK-Icon unten rechts IM Bild */}
        {fsk !== null && (
          <picture>
            <source srcSet={`/fsk/fsk-${fsk}.svg`} type="image/svg+xml" />
            <img
              src={`/fsk/fsk-${fsk}.png`}
              alt={`FSK ${fsk}`}
              className="absolute right-2 bottom-2 h-6 w-6 rounded bg-white/80 p-[2px]"
              loading="lazy"
            />
          </picture>
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
        {/* (kein FSK-Text mehr außerhalb des Bildes) */}
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