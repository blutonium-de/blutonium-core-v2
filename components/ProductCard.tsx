// components/ProductCard.tsx
"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";

type Product = {
  id: string;
  slug: string;
  artist?: string | null;
  trackTitle?: string | null;
  productName?: string | null;
  subtitle?: string | null;
  categoryCode: string;
  condition?: string | null;     // ← NEU: Zustandslabel
  priceEUR: number;
  image: string;
  images?: string[];             // Galerie-Bilder fürs Modal
  stock?: number;                // Bestand
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

function condClass(c?: string | null) {
  const v = (c || "").toLowerCase();
  // dezente, aber klar unterscheidbare Farben (Dark UI)
  if (v === "neu")        return "bg-yellow-400 text-black";
  if (v === "neuwertig")  return "bg-emerald-400 text-black";
  if (v === "ok")         return "bg-amber-400 text-black";
  if (v === "gebraucht")  return "bg-orange-500 text-black";
  if (v === "stark")      return "bg-red-500 text-black";
  return "bg-white/20"; // fallback
}

export default function ProductCard({ p }: { p: Product }) {
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<number | null>(null);
  const [slide, setSlide] = useState(0);

  const title =
    p.productName ||
    [p.artist, p.trackTitle].filter(Boolean).join(" – ") ||
    p.slug;

  const soldOut = (p.stock ?? 1) <= 0;

  // Galerie (mindestens Hauptbild)
  const gallery = useMemo(() => {
    const arr = Array.isArray(p.images) && p.images.length > 0 ? p.images : [p.image];
    return arr.filter(Boolean);
  }, [p.images, p.image]);

  function addToCart() {
    if (soldOut) return;

    const max = Math.max(0, p.stock ?? 1);
    const cart = readCart();
    const cur = Math.max(0, Number(cart[p.id]?.qty || 0));
    const nextQty = Math.min(max, cur + 1);

    cart[p.id] = { ...(cart[p.id] || {}), qty: nextQty, price: p.priceEUR };
    writeCart(cart);

    setAdded(true);
    if (addedTimer.current) window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setAdded(false), 1500);
  }

  function openModal() {
    if (!gallery.length) return;
    setSlide(0);
    setOpen(true);
  }

  function prev() {
    if (!gallery.length) return;
    setSlide((i) => (i - 1 + gallery.length) % gallery.length);
  }
  function next() {
    if (!gallery.length) return;
    setSlide((i) => (i + 1) % gallery.length);
  }

  // Tastatursteuerung im Modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, gallery.length]);

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-3 w-[200px]">
      {/* SR-Only Live Region */}
      <div className="sr-only" aria-live="polite">
        {added ? `${title} zum Warenkorb hinzugefügt` : ""}
      </div>

      {/* Thumbnail 180x180 sauber mittig */}
      <button
        type="button"
        onClick={openModal}
        className="relative block w-full"
        aria-label="Bild vergrößern"
        disabled={!gallery.length}
      >
        <div className="relative h-[180px] w-[180px] mx-auto overflow-hidden rounded-xl">
          <img
            src={gallery[0] || "/placeholder.png"}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
            height={180}
            width={180}
            loading="lazy"
          />
          {soldOut && (
            <div className="absolute left-2 top-2 rounded bg-red-500 text-black text-[10px] font-bold px-1.5 py-0.5">
              Ausverkauft
            </div>
          )}
          <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px]">
            Vergrößern
          </div>
        </div>
      </button>

      {/* Text */}
      <div className="mt-3">
        <div className="flex items-center gap-2">
          {/* Kategorie */}
          <span className="text-[11px] uppercase opacity-70">{p.categoryCode.toUpperCase()}</span>
          {/* Zustands-Label */}
          {p.condition ? (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${condClass(p.condition)}`}>
              {p.condition}
            </span>
          ) : null}
        </div>

        {/* Subtitle (kleiner) */}
        {p.subtitle ? (
          <div className="text-[10px] opacity-70 line-clamp-1">{p.subtitle}</div>
        ) : (
          // gleiche Höhe sichern
          <div className="text-[10px] opacity-0 select-none">.</div>
        )}

        {/* Fix: genau 2 Zeilen reservieren */}
        <div className="mt-1 font-semibold leading-snug line-clamp-2 min-h-[2.8em]">
          {title}
        </div>

        <div className="mt-2">
          <div className="font-semibold text-sm">{p.priceEUR.toFixed(2)} €</div>
          <button
            type="button"
            onClick={addToCart}
            disabled={soldOut}
            className={`mt-1 w-full px-2 py-1 rounded text-xs font-semibold transition
              ${
                soldOut
                  ? "bg-white/10 text-white/50 cursor-not-allowed"
                  : added
                  ? "bg-emerald-500 text-black"
                  : "bg-cyan-500 text-black hover:bg-cyan-400"
              }`}
            title={soldOut ? "Nicht verfügbar" : "In den Warenkorb"}
          >
            {soldOut ? "Nicht verfügbar" : added ? "Hinzugefügt ✓" : "In den Warenkorb"}
          </button>
        </div>

        {!soldOut && added && (
          <div className="mt-2 text-[11px]">
            <Link href="/de/cart" className="underline underline-offset-2 opacity-90 hover:opacity-100">
              Zum Warenkorb →
            </Link>
          </div>
        )}

        {!soldOut && typeof p.stock === "number" && (
          <div className="mt-1 text-[11px] opacity-70">Lagerbestand: {p.stock}</div>
        )}
      </div>

      {/* Modal 500x500 + Carousel */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-4">
          <div className="relative">
            <img
              src={gallery[slide] || "/placeholder.png"}
              alt={`${title} – Bild ${slide + 1}`}
              width={500}
              height={500}
              className="h-[500px] w-[500px] object-contain rounded-xl bg-black cursor-pointer"
              onClick={next}
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -right-3 -top-3 rounded-full bg-white text-black px-3 py-1 text-sm font-semibold shadow"
            >
              Schließen
            </button>

            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded bg-white/80 hover:bg-white text-black px-2 py-1"
                  aria-label="Vorheriges Bild"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-white/80 hover:bg-white text-black px-2 py-1"
                  aria-label="Nächstes Bild"
                >
                  ›
                </button>

                {/* Thumbs */}
                <div className="mt-3 flex items-center justify-center gap-2">
                  {gallery.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      onClick={() => setSlide(i)}
                      className={`h-12 w-12 rounded overflow-hidden border ${
                        i === slide ? "border-cyan-400" : "border-white/20"
                      }`}
                      title={`Bild ${i + 1}`}
                    >
                      <img
                        src={src}
                        alt={`Thumb ${i + 1}`}
                        className="h-full w-full object-cover"
                        height={48}
                        width={48}
                      />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}