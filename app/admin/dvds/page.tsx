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
  priceEUR: number;
  active: boolean;
  createdAt: string;
  stock?: number | null;
  image?: string | null;
  categoryCode: string;
  format?: string | null;
  genre?: string | null;
};

export default function AdminDvdsPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 🔐 Admin-Key Handling (nur Ergänzung)
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [askKey, setAskKey] = useState(false);

  useEffect(() => {
    const k =
      (typeof window !== "undefined" && localStorage.getItem("admin_key")) ||
      (process.env.NEXT_PUBLIC_ADMIN_TOKEN || "") ||
      null;
    if (!k) {
      setAskKey(true);
      setAdminKey(null);
    } else {
      setAdminKey(k);
    }
  }, []);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const url = new URL("/api/admin/products", window.location.origin);
      // DVD + Blu-ray
      url.searchParams.set("cat", "dvd,bd");
      if (q) url.searchParams.set("q", q);

      const r = await fetch(url.toString(), {
        cache: "no-store",
        // 🔐 Admin-Key mitschicken
        headers: adminKey ? { "x-admin-key": adminKey } : undefined,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Fehler beim Laden");
      const items: Row[] = Array.isArray(j.items) ? j.items : [];

      // neueste zuerst, nur 10
      items.sort((a,b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      setRows(items.slice(0, 10));
    } catch (e: any) {
      setErr(e?.message || "Fehler");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (adminKey) load(); }, [adminKey]);

  function fmtDate(iso: string) {
    try { return new Date(iso).toLocaleString("de-AT"); } catch { return iso; }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold">Admin · DVDs / Blu-rays</h1>
        <div className="flex gap-2">
          <button onClick={load} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">Aktualisieren</button>
          <Link href="/admin/dvds/new" className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
            Neu anlegen
          </Link>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="input flex-1"
          placeholder="Suche (Titel, Regie, Slug, EAN …)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button onClick={load} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">Suchen</button>
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
              <th className="py-2 pr-6">Titel / Regie</th>
              <th className="py-2 pr-4">Stock</th>
              <th className="py-2 pr-4">Preis</th>
              <th className="py-2 pr-4">Format</th>
              <th className="py-2 pr-4">Slug</th>
              <th className="py-2 pr-4">Datum</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="py-6 opacity-70">Keine DVDs gefunden.</td></tr>
            ) : rows.map((r) => {
              const isOut = (r.stock ?? 0) <= 0;
              const title = r.productName || r.slug;
              return (
                <tr key={r.id} className="border-t border-white/10 align-middle">
                  <td className="py-2 pr-4">
                    <div className="h-[50px] w-[38px] rounded overflow-hidden bg-white/5 border border-white/10">
                      <img src={r.image || "/placeholder.png"} alt={title} width={38} height={50} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/dvds/edit/${r.id}`} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20" title="Bearbeiten">✏️</Link>
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${isOut ? "bg-red-500/30" : r.active ? "bg-green-500/30" : "bg-orange-500/30"}`}>
                      {isOut ? "ausverkauft" : r.active ? "aktiv" : "inaktiv"}
                    </span>
                  </td>
                  <td className="py-2 pr-6">
                    <div className="truncate">{title}</div>
                    <div className="text-[11px] opacity-60">
                      {(r.artist ? `Regie: ${r.artist} · ` : "")}{r.genre || ""}{r.genre ? " · " : ""}{(r.format || "").toUpperCase()}
                    </div>
                  </td>
                  <td className="py-2 pr-4">{typeof r.stock === "number" ? (isOut ? <span className="text-red-300 font-semibold">{r.stock}</span> : r.stock) : "—"}</td>
                  <td className="py-2 pr-4">{r.priceEUR.toFixed(2)} €</td>
                  <td className="py-2 pr-4">{r.format || "—"}</td>
                  <td className="py-2 pr-4">{r.slug}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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

      {/* 🔐 Admin-Key Dialog (nur falls Key fehlt) */}
      {askKey && (
        <AdminKeyDialog
          onSave={(k) => {
            try { localStorage.setItem("admin_key", k.trim()); } catch {}
            setAskKey(false);
            setAdminKey(k.trim());
            setTimeout(() => window.location.reload(), 50);
          }}
        />
      )}
    </div>
  );
}

function AdminKeyDialog({ onSave }: { onSave: (k: string) => void }) {
  const [v, setV] = useState("");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur">
      <div className="w-[92%] max-w-md rounded-2xl border border-white/10 bg-black p-5">
        <h2 className="text-lg font-bold">Admin-Zugang</h2>
        <p className="mt-1 text-sm opacity-75">
          Bitte gib deinen <code>admin_key</code> ein, um die DVD-Verwaltung zu öffnen.
        </p>
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          className="mt-4 w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10"
          placeholder="Admin-Key"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="px-3 py-2 rounded bg-white/10 hover:bg-white/20"
            onClick={() => (window.location.href = "/admin")}
          >
            Abbrechen
          </button>
          <button
            disabled={!v.trim()}
            className="px-3 py-2 rounded bg-cyan-500 text-black font-semibold disabled:opacity-60"
            onClick={() => onSave(v)}
          >
            Bestätigen
          </button>
        </div>
      </div>
    </div>
  );
}