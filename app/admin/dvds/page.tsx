// app/admin/dvds/page.tsx
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
  image?: string | null;
  genre?: string | null;
  format?: string | null;
};

export default function AdminDvdsPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false); // standard: nur letzte 10

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
      // gleiche Admin-API wie Produkte, aber mit Filter
      const url = new URL("/api/admin/products", window.location.origin);
      if (q) url.searchParams.set("q", q);
      if (adminKey) url.searchParams.set("key", adminKey);

      // DVDs: Entweder categoryCode=dvd ODER format enthält „DVD/Bluray“
      // -> das Backendlayer filtert bereits mit q/OR; hier clientseitig nochmal
      const r = await fetch(url.toString(), { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Fehler beim Laden");

      const all: Row[] = (Array.isArray(j.items) ? j.items : []).filter((x: Row) => {
        const f = (x.format || "").toLowerCase();
        return x.categoryCode === "dvd" || f.includes("dvd") || f.includes("blu") || f.includes("bluray") || f.includes("blu-ray");
      });

      // standard: nur die neuesten 10
      const sorted = all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      setRows(showAll ? sorted : sorted.slice(0, 10));
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
  }, [showAll]);

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
    if (!confirm(`DVD „${slug}“ wirklich löschen?`)) return;
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
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold">Admin · DVDs</h1>
        <div className="flex gap-2">
          <button onClick={load} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">
            Liste aktualisieren
          </button>
          <Link
            href="/admin/dvds/new"
            className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
          >
            Neue DVD anlegen
          </Link>
        </div>
      </div>

      {/* Filter */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3">
        <input
          className="input"
          placeholder="Suche in DVDs (Titel, Artist, Slug, SKU, EAN ...)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button onClick={load} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">
          Filtern
        </button>
        <button
          onClick={() => setShowAll((v) => !v)}
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
          title="Umschalten zwischen Top 10 und allen"
        >
          {showAll ? "Nur Top 10 zeigen" : "Alle zeigen"}
        </button>
      </div>

      {err && <p className="text-red-500 mt-4">{err}</p>}
      {loading && <p className="mt-4 opacity-70">Lade …</p>}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="opacity-70 text-left">
            <tr>
              <th className="py-2 pr-4">Cover</th>
              <th className="py-2 pr-4">Aktionen</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-6">Titel</th>
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
                  Keine DVDs gefunden.
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

                    <td className="py-2 pr-6">
                      <div className="truncate">{title}</div>
                      <div className="text-[11px] opacity-60">
                        {(r.format || r.categoryCode || "").toUpperCase()}
                      </div>
                    </td>

                    <td className="py-2 pr-4">
                      {typeof r.stock === "number" ? (
                        <span className={isOut ? "text-red-300 font-semibold" : ""}>
                          {r.stock}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="py-2 pr-4">
                      {r.priceEUR.toFixed(2)} {r.currency || "EUR"}
                    </td>

                    <td className="py-2 pr-4">
                      <span className="opacity-80">{r.slug}</span>
                    </td>

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