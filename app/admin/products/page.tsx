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
  image?: string | null; // Cover für die Liste
  genre?: string | null; // ⬅️ NEU: Genre für Badge
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
      setRows(Array.isArray(j.items) ? j.items : []);
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
    } catch {
      alert("Konnte Status nicht ändern.");
    }
  }

  async function remove(id: string, slug: string) {
    if (!confirm(`Produkt „${slug}“ wirklich löschen?`)) return;
    try {
      const r = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey },
      });
      if (!r.ok) throw new Error("Löschen fehlgeschlagen");
      setRows((old) => old.filter((x) => x.id !== id));
    } catch {
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

      {/* Filter */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3">
        <input
          className="input"
          placeholder="Suche (Artist, Titel, Slug, SKU, EAN ...)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Alle Kategorien</option>
          <option value="bv">Blutonium Vinyls</option>
          <option value="sv">Sonstige Vinyls</option>
          <option value="bcd">Blutonium CDs</option>
          <option value="scd">Sonstige CDs</option>
          <option value="bhs">Blutonium Hardstyle Samples</option>
          <option value="ss">Sonstiges & Specials</option>
        </select>
        <button onClick={load} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">
          Filtern
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => { setSoldOutOnly(false); load(); }}
          className={`px-3 py-1 rounded-lg border ${
            !soldOutOnly
              ? "bg-cyan-500 text-black border-cyan-500"
              : "bg-white/5 border-white/10 hover:bg-white/10"
          }`}
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
        >
          Nur ausverkauft
        </button>
      </div>

      {err && <p className="text-red-500 mt-4">{err}</p>}
      {loading && <p className="mt-4 opacity-70">Lade …</p>}

      {/* NEUE SPALTENREIHENFOLGE */}
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="opacity-70 text-left">
            <tr>
              <th className="py-2 pr-4">Cover</th>
              <th className="py-2 pr-4">Aktionen</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-6">Artist / Titel</th>
              <th className="py-2 pr-4">Stock</th>
              <th className="py-2 pr-4">Preis</th>
              <th className="py-2 pr-4">Slug</th>
              <th className="py-2 pr-4">Datum</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 opacity-70">
                  Keine Produkte gefunden.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const isOut = (r.stock ?? 0) <= 0;
                const title =
                  r.productName ||
                  [r.artist, r.trackTitle].filter(Boolean).join(" – ") ||
                  r.slug;

                return (
                  <tr key={r.id} className="border-t border-white/10 align-middle">
                    {/* Cover */}
                    <td className="py-2 pr-4">
                      <div className="h-[50px] w-[50px] rounded overflow-hidden bg-white/5 border border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={r.image || "/placeholder.png"}
                          alt={title}
                          width={50}
                          height={50}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    </td>

                    {/* Aktionen */}
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/products/edit/${r.id}`}
                          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                          title="Bearbeiten"
                        >
                          ✏️
                        </Link>
                        <button
                          onClick={() => remove(r.id, r.slug)}
                          className="px-2 py-1 rounded bg-red-500/30 hover:bg-red-500/50"
                          title="Löschen"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>

                    {/* Status + Genre */}
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
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
                        {r.genre ? (
                          <span
                            className="rounded-full border border-violet-400/30 bg-violet-500/15 px-2 py-[1px] text-[10px] leading-4 text-violet-200"
                            title={`Genre: ${r.genre}`}
                          >
                            {r.genre}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Artist / Titel */}
                    <td className="py-2 pr-6">
                      <div className="truncate">{title}</div>
                      <div className="text-[11px] opacity-60">{r.categoryCode}</div>
                    </td>

                    {/* Stock */}
                    <td className="py-2 pr-4">
                      {typeof r.stock === "number" ? (
                        <span className={isOut ? "text-red-300 font-semibold" : ""}>
                          {r.stock}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Preis */}
                    <td className="py-2 pr-4">
                      {r.priceEUR.toFixed(2)} {r.currency || "EUR"}
                    </td>

                    {/* Slug */}
                    <td className="py-2 pr-4">
                      <span className="opacity-80">{r.slug}</span>
                    </td>

                    {/* Datum */}
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {fmtDate(r.createdAt)}
                    </td>
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