// app/admin/dvds/ean/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BarcodeScanner from "@/components/BarcodeScanner";

type LookupResult = {
  source: string;
  ean: string;
  title: string | null;
  year: number | null;
  director: string | null;
  genre: string | null;
  edition: string | null;
  cover: string | null;
  format: string;        // "DVD" | "Blu-ray"
  categoryCode: "dvd" | "bray";
  fsk: number | null;    // 0/6/12/16/18 oder null
};

export default function DvdEanInputPage() {
  const router = useRouter();
  const [ean, setEan] = useState("");
  const [res, setRes] = useState<LookupResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  async function lookup(v?: string) {
    const code = (v ?? ean).trim();
    if (!code) return;
    setBusy(true);
    setMsg("Suche Metadaten …");
    setRes(null);
    try {
      const r = await fetch(`/api/utils/lookup-dvd?barcode=${encodeURIComponent(code)}`, { cache: "no-store" });
      const t = await r.text();
      let j: any; try { j = JSON.parse(t); } catch { j = { error: t || "server error" }; }
      if (!r.ok) throw new Error(j?.error || "Kein Treffer");
      setRes(j as LookupResult);
      setMsg(`Gefunden aus ${j.source} ✔`);
    } catch (e: any) {
      setMsg(e?.message || "Fehler");
    } finally {
      setBusy(false);
    }
  }

  function handleUseInForm() {
    if (!res) return;
    const prefill = {
      ean: res.ean,
      title: res.title,
      year: res.year,
      director: res.director,
      genre: res.genre,
      cover: res.cover,
      format: res.format,
      categoryCode: res.categoryCode,
      fsk: res.fsk, // numerisch
      edition: res.edition,
    };
    try { sessionStorage.setItem("dvd_prefill", JSON.stringify(prefill)); } catch {}
    router.push("/admin/dvds/new");
  }

  function handleDetected(code: string) {
    setScannerOpen(false);
    setEan(code);
    lookup(code);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl sm:text-4xl font-extrabold">EAN-Schnellerfassung (DVD / Blu-ray)</h1>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
        <input
          className="input"
          placeholder="EAN/UPC (z. B. 4013549073615)"
          value={ean}
          onChange={(e) => setEan(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
        />
        <button className="px-4 py-2 rounded bg-white/10 hover:bg-white/20" onClick={() => lookup()} disabled={busy}>
          {busy ? "Suche…" : "Suchen"}
        </button>
        <button className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold" onClick={() => setScannerOpen(true)}>
          Scanner
        </button>
      </div>

      {msg && <div className="mt-3 text-sm opacity-80">{msg}</div>}

      {res && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-4 rounded-xl border border-white/10 p-4 bg-white/5">
          <div className="h-[160px] w-[120px] overflow-hidden rounded bg-white/10 border border-white/10">
            {res.cover ? (
              <img src={res.cover} alt={res.title || res.ean} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full grid place-items-center text-xs opacity-60">kein Cover</div>
            )}
          </div>
          <div>
            <div className="text-xl font-bold">{res.title || "—"}</div>
            <div className="opacity-70 text-sm mt-1">
              {res.year ? `Jahr: ${res.year} · ` : ""}{res.director ? `Regie: ${res.director} · ` : ""}{res.genre || "—"}
            </div>
            <div className="opacity-70 text-sm mt-1">
              Format: {res.format} · Kategorie: {res.categoryCode.toUpperCase()} · FSK: {res.fsk ?? "—"}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
                onClick={handleUseInForm}
              >
                In „Neu anlegen“ übernehmen →
              </button>
              <button
                className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
                onClick={() => setRes(null)}
              >
                Verwerfen
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
        }
      `}</style>

      {scannerOpen && (
        <BarcodeScanner
          onDetected={handleDetected}
          onClose={() => setScannerOpen(false)}
          formats={["ean_13","ean_8","upc_a","upc_e","code_128"]}
        />
      )}
    </div>
  );
}