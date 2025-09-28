// app/admin/products/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  slug: string;
  productName: string | null;
  artist: string | null;
  trackTitle: string | null;
  categoryCode: string;
  priceEUR: number;
  currency: string | null;
  active: boolean;
  createdAt: string;
  stock?: number | null;
  image?: string | null; // ← NEU: Cover
};

export default function AdminProductsPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [soldOutOnly, setSoldOutOnly] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const adminKey = useMemo(
    () =>
      (typeof window !== "undefined" && localStorage.getItem("admin_key")) ||
      process.env.NEXT_PUBLIC_ADMIN_TOKEN ||
      "",
    []
  );

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const url = new URL("/api/admin/products", window.location.origin);
      if (q) url.searchParams.set("q", q);
      if (cat) url.searchParams.set("cat", cat);
      if (soldOutOnly) url.searchParams.set("soldOut", "1");
      if (adminKey) url.searchParams.set("key", adminKey);

      const r = await fetch(url.toString(), { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Fehler beim Laden");
      setRows(j.items || []);
    } catch (e: any) {
      setErr(e?.message || "Fehler");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fmtDate(iso: string) {
    try {
      return new Date(iso).toLocaleString("de-AT");
    } catch {
      return iso;
    }
  }

  function displayTitle(r: Row) {
    if (r.productName && r.productName.trim()) return r.productName;
    const a = (r.artist || "").trim();
    const t = (r.trackTitle || "").trim();
    const sep = a && t ? " – " : "";
    return (a || t) ? `${a}${sep}${t}` : r.slug;
    }

  async function toggleActive(id: string, current: boolean) {
    try {
      const r = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ active: !current }),
      });
      if (!r.ok) throw new Error("Update fehlgeschlagen");
      setRows((old) => old.map((x) => (x.id === id ? { ...x, active: !current } : x)));
    } catch (e) {
      alert("Konnte Status nicht ändern.");
    }
  }

  async function remove(id: string, slug: string) {
    if (!confirm(`Produkt „${slug}” wirklich löschen?`)) return;
    try {
      const r = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey },
      });
      if (!r.ok) throw new Error("Löschen fehlgeschlagen");
      setRows((old) => old.filter((x) => x.id !== id));
    } catch (e) {
      alert("Konnte nicht löschen.");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl sm:text-4xl font-extrabold">Admin · Produkte</h1>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
            title="Liste aktualisieren"
          >
            Produktliste aktualisieren
          </button>
          <Link
            href="/admin/new"
            className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
          >
            Neues Produkt anlegen
          </Link>
        </div>
      </div>

      {/* Filterzeile */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3">
        <input
          className="input"
          placeholder="Suche (Artist, Titel, Slug, SKU, EAN ...)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <select
          className="input"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
        >
          <option value="">Alle Kategorien</option>
          <option value="bv">Blutonium Vinyls</option>
          <option value="sv">Sonstige Vinyls</option>
          <option value="bcd">Blutonium CDs</option>
          <option value="scd">Sonstige CDs</option>
          <option value="bhs">Blutonium Hardstyle Samples</option>
          <option value="ss">Sonstiges & Specials</option>
        </select>
        <button
          onClick={load}
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
        >
          Filtern
        </button>
      </div>

      {/* Zusatz-Filterchips */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => { setSoldOutOnly(false); load(); }}
          className={`px-3 py-1 rounded-lg border ${
            !soldOutOnly
              ? "bg-cyan-500 text-black border-cyan-500"
              : "bg-white/5 border-white/10 hover:bg-white/10"
          }`}
          title="Alle zeigen"
        >
          Alle
        </button>
        <button
          type="button"
          onClick={() => { setSoldOutOnly(true); load(); }}
          className={`px-3 py-1 rounded-lg border ${
            soldOutOnly
              ? "bg-cyan-500 text-black border-cyan-500"
              : "bg-white/5 border-white/10 hover:bg-white/10"
          }`}
          title="Nur ausverkauft anzeigen"
        >
          Nur ausverkauft
        </button>
      </div>

      {err && <p className="text-red-500 mt-4">{err}</p>}
      {loading && <p className="mt-4 opacity-70">Lade …</p>}

      {/* Tabelle – Spalten in gewünschter Reihenfolge */}
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm align-middle">
          <thead className="opacity-70 text-left">
            <tr>
              <th className="py-2 pr-4">Cover</th>
              <th className="py-2 pr-4">Edit</th>
              <th className="py-2 pr-4">Artist / Titel</th>
              <th className="py-2 pr-4">Stock</th>
              <th className="py-2 pr-4">Preis</th>
              <th className="py-2 pr-4">Kategorie</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Löschen</th>
              <th className="py-2 pr-4">Datum</th>
              <th className="py-2 pr-4">Slug</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-6 opacity-70">
                  Keine Produkte gefunden.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const isOut = (r.stock ?? 0) <= 0;
                const thumb = r.image || "/placeholder.png";
                return (
                  <tr key={r.id} className="border-t border-white/10">
                    {/* Cover */}
                    <td className="py-2 pr-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumb}
                        alt={displayTitle(r)}
                        className="h-12 w-12 rounded object-cover bg-black/30"
                        width={48}
                        height={48}
                        loading="lazy"
                      />
                    </td>

                    {/* Edit */}
                    <td className="py-2 pr-4">
                      <Link
                        href={`/admin/products/edit/${r.id}`}
                        className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 inline-flex items-center justify-center"
                        title="Bearbeiten"
                      >
                        ✏️
                      </Link>
                    </td>

                    {/* Artist / Titel */}
                    <td className="py-2 pr-4 max-w-[360px]">
                      <div className="truncate">{displayTitle(r)}</div>
                    </td>

                    {/* Stock */}
                    <td className="py-2 pr-4">
                      {typeof r.stock === "number" ? (
                        <span className={isOut ? "text-red-300 font-semibold" : ""}>
                          {r.stock}
                        </span>
                      ) : "—"}
                    </td>

                    {/* Preis */}
                    <td className="py-2 pr-4">
                      {r.priceEUR.toFixed(2)} {r.currency || "EUR"}
                    </td>

                    {/* Kategorie */}
                    <td className="py-2 pr-4">{r.categoryCode}</td>

                    {/* Status */}
                    <td className="py-2 pr-4">
                      <button
                        onClick={() => toggleActive(r.id, r.active)}
                        className={`px-2 py-0.5 rounded text-xs ${
                          isOut
                            ? "bg-red-500/30"
                            : r.active
                            ? "bg-green-500/30"
                            : "bg-orange-500/30"
                        }`}
                        title="Aktiv/Inaktiv umschalten"
                      >
                        {isOut ? "ausverkauft" : r.active ? "aktiv" : "inaktiv"}
                      </button>
                    </td>

                    {/* Löschen */}
                    <td className="py-2 pr-4">
                      <button
                        onClick={() => remove(r.id, r.slug)}
                        className="px-2 py-1 rounded bg-red-500/30 hover:bg-red-500/50"
                        title="Löschen"
                      >
                        🗑️
                      </button>
                    </td>

                    {/* Datum */}
                    <td className="py-2 pr-4 whitespace-nowrap">{fmtDate(r.createdAt)}</td>

                    {/* Slug */}
                    <td className="py-2 pr-4">{r.slug}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
      `}</style>
    </div>
  );
}