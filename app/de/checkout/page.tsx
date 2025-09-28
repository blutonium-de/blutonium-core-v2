// app/de/checkout/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";

type CartEntry = { qty: number; price?: number };
type CartMap = Record<string, CartEntry>;

type Product = {
  id: string;
  slug: string;
  productName: string | null;
  artist: string | null;
  trackTitle: string | null;
  priceEUR: number;
  image: string;
};

function readCart(): CartMap {
  try {
    const raw = localStorage.getItem("cart");
    return raw ? (JSON.parse(raw) as CartMap) : {};
  } catch {
    return {};
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartMap>({});
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const c = readCart();
    setCart(c);

    const ids = Object.keys(c);
    if (ids.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const url = `/api/public/products?ids=${encodeURIComponent(ids.join(","))}`;
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setItems(Array.isArray(j?.items) ? j.items : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const lines = useMemo(() => {
    return items.map((p) => {
      const qty = Math.max(0, Number(cart[p.id]?.qty || 0));
      const unitPrice = Number.isFinite(cart[p.id]?.price!)
        ? Number(cart[p.id]?.price)
        : p.priceEUR;
      return {
        product: p,
        qty,
        unitPrice,
        lineTotal: qty * unitPrice,
      };
    });
  }, [items, cart]);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.lineTotal, 0),
    [lines]
  );

  async function startPayment() {
    try {
      setErr(null);
      setPaying(true);

      // Stripe JS initialisieren
      const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!pk) throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY fehlt");
      const stripe = await loadStripe(pk);
      if (!stripe) throw new Error("Stripe konnte nicht geladen werden");

      // Session vom Server erstellen
      const body = {
        items: lines.map((l) => ({
          productId: l.product.id,
          qty: l.qty,
        })),
      };

      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const j = await res.json();
      if (!res.ok || !j?.id) {
        throw new Error(j?.error || "Konnte Stripe-Session nicht erstellen");
      }

      // Redirect zu Stripe
      const { error } = await stripe.redirectToCheckout({ sessionId: j.id });
      if (error) throw error;
    } catch (e: any) {
      setErr(e?.message || "Zahlung konnte nicht gestartet werden");
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold">Zur Kasse</h1>
        <p className="opacity-70 mt-2">Lade …</p>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold">Zur Kasse</h1>
        <p className="opacity-70 mt-2">Dein Warenkorb ist leer.</p>
        <div className="mt-6">
          <Link
            href="/de/shop"
            className="inline-flex items-center rounded bg-cyan-500 text-black px-4 py-2 font-semibold hover:bg-cyan-400"
          >
            Weiter shoppen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold">Zur Kasse</h1>
        <div className="flex gap-2">
          <Link
            href="/de/cart"
            className="inline-flex items-center rounded border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm"
          >
            Zurück zum Warenkorb
          </Link>
          <Link
            href="/de/shop"
            className="inline-flex items-center rounded border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm"
          >
            Weiter shoppen
          </Link>
        </div>
      </div>

      <p className="opacity-70 mt-2">
        Überblick &amp; Summe. (Zahlung erfolgt auf der sicheren Stripe-Seite.)
      </p>

      <div className="mt-6 space-y-3">
        {lines.map(({ product: p, qty, unitPrice, lineTotal }) => (
          <div
            key={p.id}
            className="flex items-center gap-4 rounded-2xl bg-white/5 border border-white/10 p-3"
          >
            <div className="w-[64px] h-[64px] rounded overflow-hidden bg-black/30 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image || "/placeholder.png"}
                alt={p.productName || p.slug}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">
                {p.productName && p.productName.trim().length > 0
                  ? p.productName
                  : `${p.artist ?? ""}${p.artist && p.trackTitle ? " – " : ""}${
                      p.trackTitle ?? p.slug
                    }`}
              </div>
              <div className="text-sm opacity-75">
                {qty} × {unitPrice.toFixed(2)} €
              </div>
            </div>
            <div className="w-[110px] text-right font-semibold">
              {lineTotal.toFixed(2)} €
            </div>
          </div>
        ))}
      </div>

      {err && <p className="mt-4 text-red-400">{err}</p>}

      <div className="mt-6 flex flex-col sm:flex-row items-end sm:items-center justify-end gap-4 sm:gap-6">
        <div className="text-right">
          <div className="opacity-70 text-sm">Zwischensumme</div>
          <div className="text-2xl font-extrabold">{subtotal.toFixed(2)} €</div>
          <div className="opacity-60 text-xs">
            Versand wird im Checkout berechnet.
          </div>
        </div>
        <button
          onClick={startPayment}
          disabled={paying}
          className="inline-flex items-center rounded bg-cyan-500 text-black px-5 py-3 font-semibold hover:bg-cyan-400 disabled:opacity-60"
        >
          {paying ? "Weiterleiten …" : "Zahlung starten"}
        </button>
      </div>
    </div>
  );
}