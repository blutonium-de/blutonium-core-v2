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
};

export default function DVDCard({ dvd }: { dvd: DVD }) {
  const soldOut = (dvd.stock ?? 0) <= 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.08] transition p-2 w-[140px]">
      <Link
        href={`/de/dvds/${dvd.slug}`}
        className="block relative w-full aspect-[2/3] overflow-hidden rounded-md"
        title={dvd.title}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dvd.image || "/placeholder-dvd.png"}
          alt={dvd.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {soldOut && (
          <div className="absolute top-2 left-2 bg-red-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded">
            Ausverkauft
          </div>
        )}
      </Link>

      <div className="mt-2 text-sm font-medium line-clamp-2 min-h-[2.5em]">
        {dvd.title}
      </div>

      <div className="text-xs opacity-70">
        {(dvd.genre || "—") + " · " + (dvd.format || "DVD")}
      </div>

      <div className="mt-1 flex items-center justify-between">
        <span className="font-semibold text-sm">{dvd.priceEUR.toFixed(2)} €</span>
        {soldOut ? (
          <span className="text-xs opacity-50">N/V</span>
        ) : (
          <Link
            href={`/de/dvds/${dvd.slug}`}
            className="bg-cyan-500 hover:bg-cyan-400 text-black text-xs px-2 py-1 rounded"
          >
            Details
          </Link>
        )}
      </div>
    </div>
  );
}