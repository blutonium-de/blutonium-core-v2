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
  image?: string | null;
  genre?: string | null;
};

const PAGE_SIZE = 10;
// Standard-Kategorien für den Shop (ohne Filme)
const SHOP_CATS = "bv,sv,bcd,scd,bhs,ss";

// kleine Hilfsfunktion: alte Einträge „Dance & Electronic“ als „Dance“ anzeigen
function displayGenre(g?: string | null) {
  if (!g) return g ?? undefined;
  const s = g.trim();
  if (!s) return undefined;
  const canon = s.toLowerCase().replace(/&/g, "and").replace(/\//g, " and ").replace(/\s+/g, " ");
  if (/(^|\s)dance(\s|$)/.test(canon)) return "Dance";
  return s;
}

// 🔙 Rücksprung-Ziel im SessionStorage merken (damit Edit → Speichern wieder auf diese Seite springt)
const RETURN_KEY = "admin:products:returnURL";

export default function AdminProductsPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");               // leer = Alle Shop-Kategorien
  const [soldOutOnly, setSoldOutOnly] = useState(false);

  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const adminKey = useMemo(
    () =>
      (typeof window !== "undefined" && localStorage.getItem("admin_key")) ||
      process.env.NEXT_PUBLIC_ADMIN_TOKEN ||
      "",
    []
  );

  // aktuelle Listen-URL für den Rücksprung speichern
  function rememberCurrentListURL(p: number) {
    if (typeof window === "undefined") return;
    const listUrl = new URL("/admin/products", window.location.origin);
    if (q) listUrl.searchParams.set("q", q);
    listUrl.searchParams.set("cat", cat ? cat : SHOP_CATS);
    if (soldOutOnly) listUrl.searchParams.set("soldOut", "1");
    listUrl.searchParams.set("limit", String(PAGE_SIZE));
    listUrl.searchParams.set("page", String(p));
    sessionStorage.setItem(RETURN_KEY, listUrl.toString());
  }

  async function load(p: number = page) {
    setLoading(true);
    setErr(null);
    try {
      const url = new URL("/api/admin/products", window.location.origin);

      // Suche
      if (q) url.searchParams.set("q", q);

      // ❗️WICHTIG: Standardmäßig NUR Shop-Kategorien (keine Filme)
      // Wenn im Dropdown nichts gewählt ist, senden wir die 6 Shop-Kategorien.
      url.searchParams.set("cat", cat ? cat : SHOP_CATS);

      if (soldOutOnly) url.searchParams.set("soldOut", "1");
      if (adminKey) url.searchParams.set("key", adminKey);

      // serverseitige Paginierung
      url.searchParams.set("limit", String(PAGE_SIZE));
      url.searchParams.set("page", String(p)); // 1-basiert

      const r = await fetch(url.toString(), { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Fehler beim Laden");

      const items: Row[] = Array.isArray(j.items) ? j.items : [];
      setRows(items);
      setTotal(Number.isFinite(j?.total) ? Number(j.total) : items.length);
      setPage(p);

      // 🔙 Nach erfolgreichem Laden: Rücksprung-Ziel merken
      rememberCurrentListURL(p);
    } catch (e: any) {
      setErr(e?.message || "Fehler");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  // Initial laden
  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bei Kategoriewechsel direkt neu laden
  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat]);

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
      setTotal((t) => Math.max(0, t - 1));
      if (rows.length === 1 && page > 1) load(page - 1);
      else rememberCurrentListURL(page);
    } catch {
      alert("Konnte nicht löschen.");
    }
  }

  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < maxPage;

  // ▶ Pager-Handler
  const goFirst = () => load(1);
  const goPrev  = () => hasPrev && load(page - 1);
  const goNext  = () => hasNext && load(page + 1);
  const goLast  = () => load(maxPage);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* TOP BAR */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-3xl sm:text-4xl font-extrabold">Admin · Produkte</h1>
        <div className="flex gap-2">
          <Link href="/admin" className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">
            ← Admin Hauptmenü
          </Link>
          <button onClick={() => load(page)} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">
            Produktliste aktualisieren
          </button>
          <Link
            href="/admin/new"
            className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
          >
            + Neues Produkt
          </Link>
        </div>
      </div>

      {/* Filter */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3">
        <input
          className="input"
          placeholder="Suche (Artist, Titel, Slug, SKU, EAN ...)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(1)}
        />
        <select
          className="input"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          title="Kategorie filtern (ohne Filme)"
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
          onClick={() => {
            setSoldOutOnly(false);
            load(1);
          }}
          className={`px-4 py-2 rounded ${
            !soldOutOnly ? "bg-cyan-500 text-black" : "bg-white/10 hover:bg-white/20"
          }`}
          title="Alle"
        >
          Alle
        </button>
        <button
          onClick={() => {
            setSoldOutOnly(true);
            load(1);
          }}
          className={`px-4 py-2 rounded ${
            soldOutOnly ? "bg-cyan-500 text-black" : "bg-white/10 hover:bg-white/20"
          }`}
          title="Nur ausverkauft"
        >
          Nur ausverkauft
        </button>
      </div>

      {/* Info + Pagination (oben) */}
      <div className="mt-3 flex items-center justify-between flex-wrap gap-2 text-sm">
        <div className="opacity-70">
          Seite {page} / {maxPage} · {Math.min(page * PAGE_SIZE, total)} von {total} Einträgen
        </div>
        <div className="flex gap-2">
          <button onClick={goFirst} disabled={!hasPrev} className="px-3 py-1 rounded bg-white/10 disabled:opacity-40 hover:bg-white/20">I&lt;</button>
          <button onClick={goPrev}  disabled={!hasPrev} className="px-3 py-1 rounded bg-white/10 disabled:opacity-40 hover:bg-white/20">&lt;</button>
          <button onClick={goNext}  disabled={!hasNext} className="px-3 py-1 rounded bg-white/10 disabled:opacity-40 hover:bg-white/20">&gt;</button>
          <button onClick={goLast}  disabled={!hasNext} className="px-3 py-1 rounded bg-white/10 disabled:opacity-40 hover:bg-white/20">&gt;I</button>
        </div>
      </div>

      {err && <p className="text-red-500 mt-4">{err}</p>}
      {loading && <p className="mt-4 opacity-70">Lade …</p>}

      {/* TABELLE */}
      <div className="mt-4 overflow-x-auto">
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
                const genreBadge = displayGenre(r.genre);

                return (
                  <tr key={r.id} className="border-t border-white/10 align-middle">
                    {/* Cover */}
                    <td className="py-2 pr-4">
                      <div className="h-[50px] w-[50px] rounded overflow-hidden bg-white/5 border border-white/10">
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
                          href={`/admin/products/edit/${r.id}${
                            adminKey ? `?key=${encodeURIComponent(adminKey)}` : ""
                          }`}
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
                        {genreBadge ? (
                          <span
                            className="rounded-full border border-violet-400/30 bg-violet-500/15 px-2 py-[1px] text-[10px] leading-4 text-violet-200"
                            title={`Genre: ${genreBadge}`}
                          >
                            {genreBadge}
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
                    <td className="py-2 pr-4 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* BOTTOM BAR */}
      <div className="mt-6 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <Link href="/admin" className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">
            ← Admin Hauptmenü
          </Link>
          <Link
            href="/admin/new"
            className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
          >
            + Neues Produkt
          </Link>
        </div>

        <div className="flex gap-2 text-sm">
          <button onClick={goFirst} disabled={!hasPrev} className="px-3 py-1 rounded bg-white/10 disabled:opacity-40 hover:bg-white/20">I&lt;</button>
          <button onClick={goPrev}  disabled={!hasPrev} className="px-3 py-1 rounded bg-white/10 disabled:opacity-40 hover:bg-white/20">&lt;</button>
          <div className="px-2 py-1 opacity-70">Seite {page} / {maxPage}</div>
          <button onClick={goNext}  disabled={!hasNext} className="px-3 py-1 rounded bg-white/10 disabled:opacity-40 hover:bg-white/20">&gt;</button>
          <button onClick={goLast}  disabled={!hasNext} className="px-3 py-1 rounded bg-white/10 disabled:opacity-40 hover:bg-white/20">&gt;I</button>
        </div>
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