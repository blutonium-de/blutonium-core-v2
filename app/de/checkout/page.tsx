// app/de/checkout/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getShippingOptions,
  sumWeight,
  type RegionCode,
} from "../../../lib/shipping";
import PayPalCheckout from "@/components/PayPalCheckout"; // <— statt PayPalInline

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
  stock: number | null;
  isDigital: boolean | null;
  active: boolean;
  weightGrams: number | null;
};

function readCart(): CartMap {
  try {
    return JSON.parse(localStorage.getItem("cart") || "{}");
  } catch {
    return {};
  }
}

function readRegion(): RegionCode {
  try {
    const r = localStorage.getItem("ship_region") as RegionCode | null;
    if (r === "AT" || r === "EU") return r;
  } catch {}
  return "AT";
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartMap>({});
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [region, setRegion] = useState<RegionCode>("AT");
  const [shipIdx, setShipIdx] = useState(0);

  useEffect(() => {
    setRegion(readRegion());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ship_region", region);
    } catch {}
  }, [region]);

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
    return items
      .map((p) => {
        const qty = Math.max(0, Number(cart[p.id]?.qty || 0));
        const unitPrice = Number.isFinite(cart[p.id]?.price!)
          ? Number(cart[p.id]?.price)
          : p.priceEUR;
        const max = Math.max(0, Number(p.stock ?? 0));
        const clampedQty = Math.min(qty, max);
        const lineTotal = clampedQty * unitPrice;
        const title =
          p.productName && p.productName.trim().length > 0
            ? p.productName
            : `${p.artist ?? ""}${
                p.artist && p.trackTitle ? " – " : ""
              }${p.trackTitle ?? p.slug}`;
        return { product: p, qty: clampedQty, unitPrice, lineTotal, title };
      })
      .filter((l) => l.qty > 0 && l.product.active);
  }, [items, cart]);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.lineTotal, 0),
    [lines]
  );

  const totalWeight = useMemo(
    () =>
      sumWeight(
        lines.map((l) => ({
          weightGrams: l.product.weightGrams ?? 0,
          qty: l.qty,
        }))
      ),
    [lines]
  );

  const shippingOptions = useMemo(() => {
    if (lines.length === 0) return [];
    return getShippingOptions({
      region,
      totalWeightGrams: totalWeight,
      subtotalEUR: subtotal,
    });
  }, [region, totalWeight, subtotal, lines.length]);

  const chosen = shippingOptions[shipIdx] || shippingOptions[0];

  async function goToStripe() {
    setErr(null);
    setCreating(true);
    try {
      const payload = {
        region,
        shipping: chosen
          ? {
              name: chosen.name,
              amountEUR: chosen.amountEUR,
              carrier: chosen.carrier,
            }
          : null,
        items: lines.map((l) => ({ id: l.product.id, qty: l.qty })),
      };
      const r = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok || !j?.url)
        throw new Error(j?.error || "Konnte Checkout nicht starten.");
      window.location.href = j.url as string;
    } catch (e: any) {
      setErr(e?.message || "Fehler beim Start des Checkouts");
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">Zur Kasse</h1>
        <p className="opacity-70">Lade …</p>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">Zur Kasse</h1>
        <p className="opacity-70">Dein Warenkorb ist leer.</p>
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

  const shippingEUR = chosen ? chosen.amountEUR : 0;
  const grandTotal = subtotal + shippingEUR;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Zur Kasse</h1>

      {/* Region */}
      <div className="mb-4 flex items-center gap-2">
        <div className="text-sm opacity-80">Versandregion:</div>
        <select
          value={region}
          onChange={(e) => {
            setRegion(e.target.value as RegionCode);
            setShipIdx(0);
          }}
          className="rounded bg-white/5 border border-white/15 px-2 py-1 text-sm"
        >
          <option value="AT">Österreich (AT)</option>
          <option value="EU">EU</option>
        </select>
      </div>

      {/* Positionen */}
      <div className="space-y-3">
        {lines.map((l) => (
          <div
            key={l.product.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="font-semibold truncate">{l.title}</div>
              <div className="text-xs opacity-70">
                {l.qty} × {l.unitPrice.toFixed(2)} €
              </div>
            </div>
            <div className="shrink-0 font-semibold">
              {l.lineTotal.toFixed(2)} €
            </div>
          </div>
        ))}
      </div>

      {/* Versandauswahl & Summen */}
      <div className="mt-6 flex items-start justify-between gap-6 flex-wrap">
        <Link
          href="/de/cart"
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
        >
          Zurück zum Warenkorb
        </Link>

        <div className="ml-auto w-full sm:w-auto text-right">
          <div className="opacity-70 text-sm">Zwischensumme</div>
          <div className="text-xl font-bold">{subtotal.toFixed(2)} €</div>

          {shippingOptions.length > 0 && (
            <div className="mt-3 text-left">
              <div className="opacity-70 text-sm mb-1">Versandoption:</div>
              <select
                className="w-full sm:w-[360px] rounded bg-white/5 border border-white/15 px-2 py-2 text-sm"
                value={shipIdx}
                onChange={(e) => setShipIdx(Number(e.target.value))}
              >
                {shippingOptions.map((q, idx) => (
                  <option key={`${q.carrier}-${idx}`} value={idx}>
                    {q.name} —{" "}
                    {q.amountEUR === 0
                      ? "Kostenlos"
                      : `${q.amountEUR.toFixed(2)} €`}
                  </option>
                ))}
              </select>

              <div className="mt-2 text-sm opacity-80">
                Versand:{" "}
                {shippingEUR === 0
                  ? "Kostenlos"
                  : `${shippingEUR.toFixed(2)} €`}
              </div>
            </div>
          )}

          <div className="mt-3 opacity-70 text-sm">Gesamtsumme</div>
          <div className="text-2xl font-extrabold">
            {grandTotal.toFixed(2)} €
          </div>

          {err && <div className="mt-2 text-red-400 text-sm">{err}</div>}

          {/* Stripe */}
          <button
            onClick={goToStripe}
            disabled={creating}
            className="mt-3 inline-flex items-center rounded bg-cyan-500 text-black px-5 py-3 font-semibold hover:bg-cyan-400 disabled:opacity-60 w-full sm:w-auto justify-center"
          >
            {creating ? "Weiter zu Stripe …" : "Mit Karte / Apple Pay zahlen"}
          </button>

          {/* Trenner */}
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/15" />
            <div className="text-xs opacity-70">oder</div>
            <div className="h-px flex-1 bg-white/15" />
          </div>

          {/* PayPal */}
          <div className="text-left">
            <PayPalCheckout total={grandTotal} />
          </div>
        </div>
      </div>
    </div>
  );
}