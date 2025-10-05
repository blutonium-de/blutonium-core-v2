"use client";

import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AdminHome() {
  const key = process.env.NEXT_PUBLIC_ADMIN_TOKEN || "";
  const ordersHref = key
    ? `/admin/orders?key=${encodeURIComponent(key)}`
    : "/admin/orders";

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl sm:text-4xl font-extrabold">Backend · Admin</h1>
      <p className="mt-2 opacity-70">Wohin möchtest du?</p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/admin/products"
          className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-6 block"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Vinyls • CDs • Sonstiges</h2>
            <span className="text-2xl">📋</span>
          </div>
          <p className="mt-2 opacity-70">
            Alle Produkte ansehen, suchen, filtern, aktiv/inaktiv schalten,
            bearbeiten oder löschen.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-cyan-400 group-hover:underline">
            Öffnen <span>→</span>
          </div>
        </Link>

        <Link
          href="/admin/new"
          className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-6 block"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Neu Vinyl • CD anlegen</h2>
            <span className="text-2xl">➕</span>
          </div>
          <p className="mt-2 opacity-70">
            Neues Produkt mit Fotos/Barcode anlegen. Discogs-Lookup &amp; Auto-Felder inklusive.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-cyan-400 group-hover:underline">
            Öffnen <span>→</span>
          </div>
        </Link>

        {/* NEU: Bestellungen */}
        <Link
          href={ordersHref}
          className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-6 block"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Bestellungen • RGs</h2>
            <span className="text-2xl">🧾</span>
          </div>
          <p className="mt-2 opacity-70">
            Alle Bestellungen ansehen, Kundendaten und Rechnungen (PDF) abrufen.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-cyan-400 group-hover:underline">
            Öffnen <span>→</span>
          </div>
        </Link>

        {/* DVDs / Blu-rays */}
        <Link
          href="/admin/dvds"
          className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-6 block"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">DVDs • Blu-rays</h2>
            <span className="text-2xl">🎬</span>
          </div>
          <p className="mt-2 opacity-70">
            Eigene Liste und schneller Barcode-Import speziell für Filme.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-cyan-400 group-hover:underline">
            Öffnen <span>→</span>
          </div>
        </Link>

        {/* Verkauf & Offline */}
<Link
  href={process.env.NEXT_PUBLIC_ADMIN_TOKEN
    ? `/admin/soldout?key=${encodeURIComponent(process.env.NEXT_PUBLIC_ADMIN_TOKEN)}`
    : "/admin/soldout"}
  className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-6 block"
>
  <div className="flex items-center justify-between">
    <h2 className="text-xl font-bold">Verkauft & offline</h2>
    <span className="text-2xl">📦</span>
  </div>
  <p className="mt-2 opacity-70">
    Produkte mit Bestand 0 oder auf „inaktiv“. Reaktivieren, bearbeiten oder löschen.
  </p>
  <div className="mt-4 inline-flex items-center gap-2 text-cyan-400 group-hover:underline">
    Öffnen <span>→</span>
  </div>
</Link>

        {/* Analytics */}
        <Link
          href="/admin/analytics"
          className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-6 block"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Analytics · Besucher</h2>
            <span className="text-2xl">📈</span>
          </div>
          <p className="mt-2 opacity-70">
            Seitenaufrufe &amp; Top-Seiten der letzten Zeit auf einen Blick.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-cyan-400 group-hover:underline">
            Öffnen <span>→</span>
          </div>
        </Link>
      </div>
    </div>
  );
}