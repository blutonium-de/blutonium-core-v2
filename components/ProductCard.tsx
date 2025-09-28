// components/ProductCard.tsx
"use client";

import { useState, useRef } from "react";
import Link from "next/link";

type Product = {
  id: string;
  slug: string;
  artist?: string | null;
  trackTitle?: string | null;
  productName?: string | null;
  subtitle?: string | null;
  categoryCode: string;
  priceEUR: number;
  image: string;
  stock?: number; // << Bestand
};

type CartMap = Record<string, { qty: number; price?: number }>;

function readCart(): CartMap {
  try {
    const raw = localStorage.getItem("cart");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeCart(next: CartMap) {
  localStorage.setItem("cart", JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("cart:changed"));
}

export default function ProductCard({ p }: { p: Product }) {
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);          // << NEU: Kurz-Bestätigung
  const addedTimer = useRef<number | null>(null);     // für Timeout cleanup

  const title =
    p.productName ||
    [p.artist, p.trackTitle].filter(Boolean).join(" – ") ||
    p.slug;

  const soldOut = (p.stock ?? 1) <= 0;

  function addToCart() {
    if (soldOut) return;

    const max = Math.max(0, p.stock ?? 1);
    const cart = readCart();
    const cur = Math.max(0, Number(cart[p.id]?.qty || 0));
    const nextQty = Math.min(max, cur + 1);

    cart[p.id] = { ...(cart[p.id] || {}), qty: nextQty, price: p.priceEUR };
    writeCart(cart);

    // visuelles Feedback für 1.5s
    setAdded(true);
    if (addedTimer.current) window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-3 w-[270px]">
      {/* SR-Only Live Region für Screenreader */}
      <div className="sr-only" aria-live="polite">
        {added ? `${title} zum Warenkorb hinzugefügt` : ""}
      </div>

      {/* Thumbnail 250x250 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative block w-full"
        aria-label="Bild vergrößern"
        disabled={!p.image}
      >
        <div className="relative h-[250px] w-[250px] overflow-hidden rounded-xl">
          <img
            src={p.image || "/placeholder.png"}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
            height={250}
            width={250}
            loading="lazy"
          />
          {soldOut && (
            <div className="absolute left-2 top-2 rounded bg-red-500 text-black text-xs font-bold px-2 py-1">
              Ausverkauft
            </div>
          )}
          <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs">
            Vergrößern
          </div>
        </div>
      </button>

      {/* Text */}
      <div className="mt-3">
        <div className="text-xs uppercase opacity-70">{p.categoryCode.toUpperCase()}</div>
        {p.subtitle ? (
          <div className="text-[11px] opacity-70 line-clamp-1">{p.subtitle}</div>
        ) : null}
        <div className="mt-1 font-semibold leading-snug line-clamp-2">{title}</div>

        <div className="mt-2 flex items-center justify-between">
          <div className="font-semibold">{p.priceEUR.toFixed(2)} €</div>
          <button
            type="button"
            onClick={addToCart}
            disabled={soldOut}
            className={`px-3 py-1 rounded text-sm font-semibold transition
              ${soldOut
                ? "bg-white/10 text-white/50 cursor-not-allowed"
                : added
                ? "bg-emerald-500 text-black"      // << NEU: „Hinzugefügt“
                : "bg-cyan-500 text-black hover:bg-cyan-400"
              }`}
            title={soldOut ? "Nicht verfügbar" : "In den Warenkorb"}
          >
            {soldOut ? "Nicht verfügbar" : added ? "Hinzugefügt ✓" : "In den Warenkorb"}
          </button>
        </div>

        {/* Kleiner, temporärer Hinweis-Link zum Warenkorb */}
        {!soldOut && added && (
          <div className="mt-2 text-[12px]">
            <Link href="/de/cart" className="underline underline-offset-2 opacity-90 hover:opacity-100">
              Zum Warenkorb →
            </Link>
          </div>
        )}

        {!soldOut && typeof p.stock === "number" && (
          <div className="mt-1 text-[11px] opacity-70">Lagerbestand: {p.stock}</div>
        )}
      </div>

      {/* Modal 500x500 */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-4">
          <div className="relative">
            <img
              src={p.image || "/placeholder.png"}
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