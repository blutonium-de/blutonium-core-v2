"use client";

import { useState } from "react";

type Product = {
  id: string;
  slug: string;
  artist?: string | null;
  trackTitle?: string | null;
  productName?: string | null;
  subtitle?: string | null;
  categoryCode: string;
  year?: number | null;
  priceEUR: number;
  image: string; // 500x500
};

export default function ProductCard({
  p,
  onAdd,
}: {
  p: Product;
  onAdd?: (prod: Product) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const title =
    p.productName ||
    [p.artist, p.trackTitle].filter(Boolean).join(" – ") ||
    p.slug;

  const meta =
    p.categoryCode?.toUpperCase() + (p.year ? ` · ${p.year}` : "");

  async function handleAdd() {
    try {
      setAdding(true);
      if (onAdd) {
        await onAdd(p);
      } else {
        // Platzhalter: kleines „Added“ Feedback, falls noch kein echtes Cart angebunden
        await new Promise((r) => setTimeout(r, 250));
      }
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-3 w-[270px] flex flex-col">
      {/* Thumbnail 250x250 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative block w-full"
        aria-label="Bild vergrößern"
      >
        <div className="relative h-[250px] w-[250px] overflow-hidden rounded-xl">
          <img
            src={p.image}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
            height={250}
            width={250}
            loading="lazy"
          />
          <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs">
            Vergrößern
          </div>
        </div>
      </button>

      {/* Text */}
      <div className="mt-3 flex flex-col gap-1">
        <div className="text-[11px] uppercase opacity-70 tracking-wide">
          {meta}
        </div>

        <div className="font-semibold leading-snug line-clamp-2">
          {title}
        </div>

        {p.subtitle && (
          <div className="text-sm opacity-70 line-clamp-1">
            {p.subtitle}
          </div>
        )}
      </div>

      {/* Footer: Preis + Button */}
      <div className="mt-3 flex items-center justify-between">
        <div className="font-semibold">{p.priceEUR.toFixed(2)} €</div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-semibold disabled:opacity-60"
        >
          {adding ? "…" : "In den Warenkorb"}
        </button>
      </div>

      {added && (
        <div className="mt-2 text-[11px] text-emerald-300 opacity-80">
          Hinzugefügt ✔
        </div>
      )}

      {/* Modal 500x500 */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-4">
          <div className="relative">
            <img
              src={p.image}
              alt={title}
              width={500}
              height={500}
              className="h-[500px] w-[500px] object-contain rounded-xl bg-black"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -right-3 -top-3 rounded-full bg-white text-black px-3 py-1 text-sm font-semibold shadow"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}