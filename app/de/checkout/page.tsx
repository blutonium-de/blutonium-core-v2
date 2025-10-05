// app/de/checkout/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getShippingOptions,
  sumWeight,
  type RegionCode,
} from "../../../lib/shipping";
import PayPalCheckout from "@/components/PayPalCheckout";

type CartEntry = { qty: number; price?: number };
type CartMap = Record<string, CartEntry>;

type Product = {
  id: string;
  slug: string;
  productName: string | null;
  artist: string | null;
  trackTitle: string | null;
  priceEUR: number;
  image: string | null;
  stock: number | null;
  isDigital: boolean | null;
  active: boolean;
  weightGrams: number | null;
  genre?: string | null;
};

function readCart(): CartMap {
  try { return JSON.parse(localStorage.getItem("cart") || "{}"); } catch { return {}; }
}
function readRegion(): RegionCode {
  try {
    const r = localStorage.getItem("ship_region") as RegionCode | null;
    if (r === "AT" || r === "EU") return r;
  } catch {}
  return "AT";
}

export default function CheckoutPage() {
  // warenkorb
  const [cart, setCart] = useState<CartMap>({});
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // versand
  const [region, setRegion] = useState<RegionCode>("AT");
  const [shipIdx, setShipIdx] = useState(0);

  // formular
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostal] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Austria");

  // order
  const [orderId, setOrderId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // --- Prefill aus localStorage
  useEffect(() => {
    try {
      const pref = JSON.parse(localStorage.getItem("chk_addr") || "{}");
      if (pref.email) setEmail(pref.email);
      if (pref.phone) setPhone(pref.phone);
      if (pref.firstName) setFirst(pref.firstName);
      if (pref.lastName) setLast(pref.lastName);
      if (pref.street) setStreet(pref.street);
      if (pref.postalCode) setPostal(pref.postalCode);
      if (pref.city) setCity(pref.city);
      if (pref.country) setCountry(pref.country);
    } catch {}
  }, []);

  // live in localStorage spiegeln
  useEffect(() => {
    try {
      localStorage.setItem(
        "chk_addr",
        JSON.stringify({ email, phone, firstName, lastName, street, postalCode, city, country })
      );
    } catch {}
  }, [email, phone, firstName, lastName, street, postalCode, city, country]);

  useEffect(() => setRegion(readRegion()), []);
  useEffect(() => { try { localStorage.setItem("ship_region", region); } catch {} }, [region]);

  useEffect(() => {
    const c = readCart();
    setCart(c);
    const ids = Object.keys(c);
    if (ids.length === 0) { setItems([]); setLoading(false); return; }
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
          p.productName?.trim() ||
          `${p.artist ?? ""}${p.artist && p.trackTitle ? " – " : ""}${p.trackTitle ?? p.slug}`;
        return { product: p, qty: clampedQty, unitPrice, lineTotal, title };
      })
      .filter((l) => l.qty > 0 && l.product.active);
  }, [items, cart]);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.lineTotal, 0),
    [lines]
  );

  const totalWeight = useMemo(
    () => sumWeight(lines.map((l) => ({ weightGrams: l.product.weightGrams ?? 0, qty: l.qty }))),
    [lines]
  );

  const shippingOptions = useMemo(() => {
    if (lines.length === 0) return [];
    return getShippingOptions({ region, totalWeightGrams: totalWeight, subtotalEUR: subtotal });
  }, [region, totalWeight, subtotal, lines.length]);

  const chosen = shippingOptions[shipIdx] || shippingOptions[0];
  const shippingEUR = chosen ? chosen.amountEUR : 0;
  const grandTotal = subtotal + shippingEUR;

  function isEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }
  function validate(): string[] {
    const errors: string[] = [];
    if (!isEmail(email)) errors.push("Gültige E-Mail erforderlich.");
    if (!firstName.trim()) errors.push("Vorname ist erforderlich.");
    if (!lastName.trim()) errors.push("Nachname ist erforderlich.");
    if (!street.trim()) errors.push("Straße & Nr. ist erforderlich.");
    if (!postalCode.trim()) errors.push("PLZ ist erforderlich.");
    if (!city.trim()) errors.push("Ort ist erforderlich.");
    if (!country.trim()) errors.push("Land ist erforderlich.");
    return errors;
  }

  async function createOrder() {
    setErr(null);
    const v = validate();
    if (v.length) { setErr(v.join(" ")); return; }

    setCreating(true);
    try {
      const payload = {
        email,
        phone,
        firstName,
        lastName,
        street,
        postalCode,
        city,
        country,
        items: lines.map((l) => ({ productId: l.product.id, qty: l.qty })),
        currency: "EUR",
      };
      const r = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok || !j?.orderId) throw new Error(j?.error || "Konnte Bestellung nicht anlegen.");
      setOrderId(j.orderId);
    } catch (e: any) {
      setErr(e?.message || "Fehler beim Anlegen der Bestellung");
    } finally {
      setCreating(false);
    }
  }

  async function goToStripe() {
    setErr(null);
    if (!orderId) { setErr("Bitte zuerst Bestellung anlegen."); return; }

    try {
      const payload = {
        orderId,
        region,
        shipping: chosen
          ? { name: chosen.name, amountEUR: chosen.amountEUR, carrier: chosen.carrier }
          : null,
      };
      const r = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok || !j?.url) throw new Error(j?.error || "Konnte Stripe-Session nicht erstellen.");
      window.location.href = j.url as string;
    } catch (e: any) {
      setErr(e?.message || "Fehler beim Start des Stripe-Checkouts");
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
          <Link href="/de/shop" className="inline-flex items-center rounded bg-cyan-500 text-black px-4 py-2 font-semibold hover:bg-cyan-400">
            Weiter shoppen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Zur Kasse</h1>

      {/* Region */}
      <div className="mb-4 flex items-center gap-2">
        <div className="text-sm opacity-80">Versandregion:</div>
        <select
          value={region}
          onChange={(e) => { setRegion(e.target.value as RegionCode); setShipIdx(0); }}
          className="rounded bg-white/5 border border-white/15 px-2 py-1 text-sm"
        >
          <option value="AT">Österreich (AT)</option>
          <option value="EU">EU</option>
        </select>
      </div>

      {/* Positionen */}
      <div className="space-y-3">
        {lines.map((l) => {
          const imgSrc = (l.product.image && l.product.image.trim()) || "/placeholder.png";
          return (
            <div key={l.product.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
              <div className="shrink-0">
                <img
                  src={imgSrc}
                  alt={l.title}
                  width={56}
                  height={56}
                  className="w-14 h-14 object-cover rounded border border-white/10"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.png"; }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{l.title}</div>
                <div className="text-[11px] opacity-70">Genre: {l.product.genre?.trim() || "—"}</div>
                <div className="text-xs opacity-70">{l.qty} × {l.unitPrice.toFixed(2)} €</div>
              </div>
              <div className="shrink-0 font-semibold">{l.lineTotal.toFixed(2)} €</div>
            </div>
          );
        })}
      </div>

      {/* Formular + Summen */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formular */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <h2 className="font-bold mb-3">Rechnungs-/Lieferadresse</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-sm opacity-70 mb-1">E-Mail*</div>
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="du@example.com" />
            </div>
            <div>
              <div className="text-sm opacity-70 mb-1">Telefon (optional)</div>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+43 …" />
            </div>
            <div>
              <div className="text-sm opacity-70 mb-1">Vorname*</div>
              <input className="input" value={firstName} onChange={(e) => setFirst(e.target.value)} required />
            </div>
            <div>
              <div className="text-sm opacity-70 mb-1">Nachname*</div>
              <input className="input" value={lastName} onChange={(e) => setLast(e.target.value)} required />
            </div>
            <div>
              <div className="text-sm opacity-70 mb-1">Straße & Nr.*</div>
              <input className="input" value={street} onChange={(e) => setStreet(e.target.value)} required />
            </div>
            <div>
              <div className="text-sm opacity-70 mb-1">PLZ*</div>
              <input className="input" value={postalCode} onChange={(e) => setPostal(e.target.value)} required />
            </div>
            <div>
              <div className="text-sm opacity-70 mb-1">Ort*</div>
              <input className="input" value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
            <div>
              <div className="text-sm opacity-70 mb-1">Land*</div>
              <input className="input" value={country} onChange={(e) => setCountry(e.target.value)} required />
            </div>
          </div>

          {err && <div className="mt-3 text-sm text-red-400">{err}</div>}

          <div className="mt-3">
            <button
              onClick={createOrder}
              disabled={creating}
              className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold disabled:opacity-60"
            >
              {orderId ? "Bestellung aktualisieren" : "Bestellung anlegen"}
            </button>
            <div className="text-xs opacity-70 mt-2">
              Privatverkauf – kein MwSt-Ausweis. Rechnungs-PDF kommt per E-Mail nach Zahlung.
            </div>
            {orderId && (
              <div className="mt-2 text-xs text-emerald-300">
                ✅ Bestellung angelegt (ID: {orderId}). Jetzt bezahlen.
              </div>
            )}
          </div>
        </div>

        {/* Summen + Zahlarten */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="opacity-70 text-sm">Zwischensumme</div>
          <div className="text-xl font-bold">{subtotal.toFixed(2)} €</div>

          {/* Versandoption */}
          {shippingOptions.length > 0 && (
            <div className="mt-3">
              <div className="opacity-70 text-sm mb-1">Versandoption:</div>
              <select
                className="w-full rounded bg-white/5 border border-white/15 px-2 py-2 text-sm"
                value={shipIdx}
                onChange={(e) => setShipIdx(Number(e.target.value))}
              >
                {shippingOptions.map((q, idx) => (
                  <option key={`${q.carrier}-${idx}`} value={idx}>
                    {q.name} — {q.amountEUR === 0 ? "Kostenlos" : `${q.amountEUR.toFixed(2)} €`}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-sm opacity-80">
                Versand: {shippingEUR === 0 ? "Kostenlos" : `${shippingEUR.toFixed(2)} €`}
              </div>
            </div>
          )}

          <div className="mt-3 opacity-70 text-sm">Gesamtsumme</div>
          <div className="text-2xl font-extrabold">{grandTotal.toFixed(2)} €</div>

          {/* Zahlungsarten – beide parallel */}
          <h3 className="mt-4 font-semibold">Zahlungsart wählen</h3>

          {/* Stripe */}
          <button
            onClick={goToStripe}
            disabled={!orderId || creating}
            className="mt-3 inline-flex items-center rounded bg-cyan-500 text-black px-5 py-3 font-semibold hover:bg-cyan-400 disabled:opacity-60 w-full justify-center"
            title={!orderId ? "Bitte zuerst Bestellung anlegen" : "Mit Karte / Apple Pay zahlen"}
          >
            Weiter zu Stripe
          </button>

          {/* PayPal */}
          <div className={`mt-3 ${!orderId ? "opacity-60 pointer-events-none" : ""}`}>
            <PayPalCheckout
  total={grandTotal}
  orderId={orderId || undefined}
  disabled={!orderId}
  shipping={chosen ? { name: chosen.name, amountEUR: chosen.amountEUR, carrier: chosen.carrier } : null}
/>
          </div>

          {!orderId && (
            <div className="text-xs opacity-70 mt-2">
              Bitte zuerst die Adressfelder ausfüllen und „Bestellung anlegen“ klicken.
            </div>
          )}

          <div className="mt-6">
            <Link href="/de/cart" className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">
              Zurück zum Warenkorb
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
        }
      `}</style>
    </div>
  );
}