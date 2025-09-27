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
};

export default function AdminProductsPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
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
      return new Date(iso).toLocaleString();
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
    } catch (e) {
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

      {err && <p className="text-red-500 mt-4">{err}</p>}
      {loading && <p className="mt-4 opacity-70">Lade …</p>}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="opacity-70 text-left">
            <tr>
              <th className="py-2 pr-6">Datum</th>
              <th className="py-2 pr-6">Slug</th>
              <th className="py-2 pr-6">Artist / Titel</th>
              <th className="py-2 pr-6">Kategorie</th>
              <th className="py-2 pr-6">Preis</th>
              <th className="py-2 pr-6">Status</th>
              <th className="py-2 pr-6">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 opacity-70">
                  Keine Produkte gefunden.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="py-2 pr-6">{fmtDate(r.createdAt)}</td>
                  <td className="py-2 pr-6">{r.slug}</td>
                  <td className="py-2 pr-6">
                    {r.artist || "—"}
                    {r.artist && r.trackTitle ? " – " : " "}
                    {r.trackTitle || r.productName || "—"}
                  </td>
                  <td className="py-2 pr-6">{r.categoryCode}</td>
                  <td className="py-2 pr-6">
                    {r.priceEUR.toFixed(2)} {r.currency || "EUR"}
                  </td>
                  <td className="py-2 pr-6">
                    <button
                      onClick={() => toggleActive(r.id, r.active)}
                      className={`px-2 py-0.5 rounded text-xs ${
                        r.active ? "bg-green-500/30" : "bg-orange-500/30"
                      }`}
                      title="Aktiv/Inaktiv umschalten"
                    >
                      {r.active ? "aktiv" : "inaktiv"}
                    </button>
                  </td>
                  <td className="py-2 pr-6">
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
                </tr>
              ))
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