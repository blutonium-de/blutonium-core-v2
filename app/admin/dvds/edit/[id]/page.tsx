// app/admin/dvds/edit/[id]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import ImageDrop from "../../../../../components/ImageDrop";

export const dynamic = "force-dynamic";

type Product = {
  id: string;
  slug: string;
  productName?: string | null;  // Filmtitel
  subtitle?: string | null;     // Edition/Zusatz
  artist?: string | null;       // Regie
  trackTitle?: string | null;
  priceEUR: number;
  currency: string | null;
  categoryCode: "dvd" | "bray" | string;
  format?: string | null;       // "DVD" | "Blu-ray"
  year?: number | null;
  upcEan?: string | null;
  catalogNumber?: string | null;
  condition?: string | null;
  weightGrams?: number | null;
  isDigital: boolean;
  sku?: string | null;
  active: boolean;
  image: string;
  images: string[];
  genre?: string | null;
  stock?: number | null;
  fsk?: string | null;          // z.B. "FSK 16"
};

const MOVIE_GENRES = [
  "Action","Abenteuer","Animation","Dokumentation","Drama","Familie",
  "Fantasy","Historie","Horror","Komödie","Krimi","Musik","Mystery",
  "Romantik","Science Fiction","Sport","Thriller","Western"
] as const;

// ---- Helper: FSK normalisieren ("16", "FSK16", "fsk-16" -> "FSK 16") ----
function normalizeFsk(v?: string | null): string {
  if (!v) return "";
  const s = String(v).toLowerCase().replace(/\s+/g, "").replace(/-/g, "");
  if (s.includes("18") || s === "18") return "FSK 18";
  if (s.includes("16") || s === "16") return "FSK 16";
  if (s.includes("12") || s === "12") return "FSK 12";
  if (s.includes("6")  || s === "6")  return "FSK 6";
  if (s.includes("0")  || s === "0")  return "FSK 0";
  return "";
}

export default function AdminDvdEditPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const [adminKey, setAdminKey] = useState<string>(""); // leer = evtl. kein Key nötig
  const [keyReady, setKeyReady] = useState(false);      // -> erst nach Ermittlung fetchen
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState<string | null>(null);

  const [p, setP] = useState<Product | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [active, setActive] = useState<boolean>(false);

  const formRef = useRef<HTMLFormElement | null>(null);

  function submitForm() {
    formRef.current?.requestSubmit();
  }

  // Key aus URL / localStorage / ENV lesen (nur einmal)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const fromUrl   = sp.get("key") ?? "";
    const fromLocal = localStorage.getItem("admin_key") ?? "";
    const fromEnv   = process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? "";
    const key = fromUrl || fromLocal || fromEnv || "";
    setAdminKey(key);
    setKeyReady(true); // jetzt darf geladen werden
  }, []);

  // Laden (genau EIN Fetch, nachdem der Key ermittelt wurde)
  useEffect(() => {
    if (!keyReady) return;
    (async () => {
      setLoading(true);
      setMsg(null);
      try {
        const url = adminKey
          ? `/api/admin/products/${id}?key=${encodeURIComponent(adminKey)}`
          : `/api/admin/products/${id}`;

        const r = await fetch(url, { cache: "no-store" });
        const t = await r.text();
        let j: any; try { j = JSON.parse(t); } catch { throw new Error(t || "Serverfehler"); }
        if (!r.ok) throw new Error(j?.error || "Produkt nicht gefunden");

        const prod: Product = j;
        // FSK-Wert im Client normalisieren, damit defaultValue matcht
        prod.fsk = normalizeFsk(prod.fsk);

        setP(prod);
        setActive(prod.active);
        setImages(prod.images?.length ? prod.images : (prod.image ? [prod.image] : []));
      } catch (e: any) {
        setMsg(e?.message || "Fehler beim Laden");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, adminKey, keyReady]);

  // Speichern
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!p) return;

    setSaving(true);
    setMsg(null);
    try {
      const fd = new FormData(e.currentTarget);

      const body = {
        slug: String(fd.get("slug") || "").trim(),
        productName: strOrNull(fd.get("productName")),
        subtitle: strOrNull(fd.get("subtitle")),
        artist: strOrNull(fd.get("artist")),              // Regie
        trackTitle: undefined,
        priceEUR: Number(fd.get("priceEUR") || 0),
        currency: String(fd.get("currency") || "EUR"),
        categoryCode: String(fd.get("categoryCode") || "dvd"),
        format: strOrNull(fd.get("format")),
        year: numOrNull(fd.get("year")),
        upcEan: strOrNull(fd.get("upcEan")),
        catalogNumber: strOrNull(fd.get("catalogNumber")),
        condition: strOrNull(fd.get("condition")),
        weightGrams: numOrNull(fd.get("weightGrams")),
        isDigital: fd.get("isDigital") === "on",
        sku: strOrNull(fd.get("sku")),
        active,
        image: images[0] || "",
        images,
        genre: strOrNull(fd.get("genre")),
        stock: numOrNull(fd.get("stock")),
        // FSK: immer als normalisierte Standardform speichern
        fsk: normalizeFsk(String(fd.get("fsk") || "")),
      };

      const url = adminKey
        ? `/api/admin/products/${id}?key=${encodeURIComponent(adminKey)}`
        : `/api/admin/products/${id}`;

      const r = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const t = await r.text();
      let j: any; try { j = JSON.parse(t); } catch { j = { error: t || "Serverfehler" }; }
      if (!r.ok) throw new Error(j?.error || "Speichern fehlgeschlagen");

      window.location.href = "/admin/dvds?updated=1";
    } catch (e: any) {
      setMsg(e?.message || "Fehler");
    } finally {
      setSaving(false);
    }
  }

  // Aktiv/Inactive
  async function toggleActive() {
    if (!p) return;
    const next = !active;
    setActive(next);
    setMsg(null);
    try {
      const url = adminKey
        ? `/api/admin/products/${id}?key=${encodeURIComponent(adminKey)}`
        : `/api/admin/products/${id}`;

      const r = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      if (!r.ok) {
        const t = await r.text();
        let j: any; try { j = JSON.parse(t); } catch { j = { error: t || "Serverfehler" }; }
        throw new Error(j?.error || "Konnte Status nicht ändern");
      }
      setMsg(`Status: ${next ? "aktiv" : "inaktiv"}`);
    } catch (e:any) {
      setActive((v) => !v);
      setMsg(e?.message || "Fehler beim Statuswechsel");
    }
  }

  // Löschen
  async function handleDelete() {
    if (!p) return;
    if (!window.confirm("Wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.")) return;

    try {
      const url = adminKey
        ? `/api/admin/products/${id}?key=${encodeURIComponent(adminKey)}`
        : `/api/admin/products/${id}`;

      const r = await fetch(url, { method: "DELETE" });
      if (!r.ok) {
        const t = await r.text();
        let j: any; try { j = JSON.parse(t); } catch { j = { error: t || "Serverfehler" }; }
        throw new Error(j?.error || "Löschen fehlgeschlagen");
      }
      window.location.href = "/admin/dvds?deleted=1";
    } catch (e:any) {
      setMsg(e?.message || "Fehler beim Löschen");
    }
  }

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-10">Lade …</div>;
  if (!p)      return <div className="max-w-6xl mx-auto px-4 py-10 text-red-400">{msg || "Produkt nicht gefunden"}</div>;

  const isMovie = p.categoryCode === "dvd" || p.categoryCode === "bray";

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold">DVD / Blu-ray bearbeiten</h1>
        <div className="flex flex-wrap items-center gap-2">
          <a href="/admin/dvds" className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">Zur DVD-Liste</a>

          <button
            type="button"
            onClick={submitForm}
            className="px-3 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
            title="Speichern (⌘/Ctrl+S)"
          >
            Speichern
          </button>

          <button
            type="button"
            onClick={toggleActive}
            className={`px-3 py-2 rounded font-semibold ${active ? "bg-emerald-500 text-black hover:bg-emerald-400" : "bg-amber-500 text-black hover:bg-amber-400"}`}
            title={active ? "Als inaktiv markieren" : "Als aktiv markieren"}
          >
            {active ? "Aktiv" : "Inaktiv"}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="px-3 py-2 rounded bg-red-500 text-black font-semibold hover:bg-red-400"
            title="Produkt endgültig löschen"
          >
            Löschen
          </button>
        </div>
      </div>

      <p className="text-white/70 mt-2">
        Bilder kannst du unten sehen/ändern. Einzelne Bilder lassen sich in der Bildleiste mit ✕ entfernen (in <code>ImageDrop</code>).
      </p>

      <div className="mt-8">
        <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
          <ImageDrop max={5} initial={images} onChange={(arr) => setImages(arr)} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <L label="Slug*">
              <input name="slug" defaultValue={p.slug} className="input" required />
            </L>
            <L label="Filmtitel*">
              <input name="productName" defaultValue={p.productName || ""} className="input" required />
            </L>
            <L label="Edition / Zusatz">
              <input name="subtitle" defaultValue={p.subtitle || ""} className="input" />
            </L>
            <L label="Regie">
              <input name="artist" defaultValue={p.artist || ""} className="input" />
            </L>

            <L label="Preis (EUR)*">
              <input name="priceEUR" type="number" step="0.01" min="0" defaultValue={p.priceEUR} className="input" required />
            </L>
            <L label="Währung">
              <input name="currency" defaultValue={p.currency || "EUR"} className="input" />
            </L>

            <L label="Kategorie*">
              <select name="categoryCode" defaultValue={p.categoryCode} className="input" required>
                <option value="dvd">DVD</option>
                <option value="bray">Blu-ray</option>
              </select>
            </L>

            <L label="Format">
              {isMovie ? (
                <select name="format" defaultValue={p.format || ""} className="input">
                  <option value="">– auswählen –</option>
                  <option value="DVD">DVD</option>
                  <option value="Blu-ray">Blu-ray</option>
                </select>
              ) : (
                <input name="format" defaultValue={p.format || ""} className="input" />
              )}
            </L>

            <L label="Jahr">
              <input name="year" type="number" defaultValue={p.year ?? ""} className="input" />
            </L>
            <L label="EAN / UPC">
              <input name="upcEan" defaultValue={p.upcEan || ""} className="input" />
            </L>
            <L label="Katalognummer">
              <input name="catalogNumber" defaultValue={p.catalogNumber || ""} className="input" />
            </L>
            <L label="Zustand">
              <input name="condition" defaultValue={p.condition || ""} className="input" />
            </L>
            <L label="Gewicht (g)">
              <input name="weightGrams" type="number" defaultValue={p.weightGrams ?? ""} className="input" />
            </L>
            <L label="SKU">
              <input name="sku" defaultValue={p.sku || ""} className="input" />
            </L>
            <L label="Digital?">
              <input name="isDigital" type="checkbox" defaultChecked={p.isDigital} />
            </L>

            <L label="Film-Genre">
              <select name="genre" defaultValue={p.genre || ""} className="input">
                <option value="">– auswählen –</option>
                {MOVIE_GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </L>

            {/* Bestand */}
            <L label="Bestand (Stück)">
              <input name="stock" type="number" min={0} defaultValue={p.stock ?? 1} className="input" />
            </L>

            {/* FSK */}
            <L label="FSK">
              <select name="fsk" defaultValue={normalizeFsk(p.fsk)} className="input">
                <option value="">– auswählen –</option>
                <option value="FSK 0">FSK 0</option>
                <option value="FSK 6">FSK 6</option>
                <option value="FSK 12">FSK 12</option>
                <option value="FSK 16">FSK 16</option>
                <option value="FSK 18">FSK 18</option>
              </select>
            </L>
          </div>

          {msg && <div className="text-sm">{msg}</div>}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold disabled:opacity-60"
              title="Speichern"
            >
              {saving ? "Speichere …" : "Speichern & Zur Liste"}
            </button>

            <a
              href="/admin/dvds"
              className="px-3 py-2 rounded bg-white/10 hover:bg-white/20"
              title="Zurück zur DVD-Liste"
            >
              Zurück zur DVD-Liste
            </a>
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
        </form>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm mb-1 opacity-70">{label}</div>
      {children}
    </label>
  );
}

function strOrNull(v: FormDataEntryValue | null): string | undefined {
  const s = (v == null ? "" : String(v)).trim();
  return s ? s : undefined;
}
function numOrNull(v: FormDataEntryValue | null): number | undefined {
  const s = (v == null ? "" : String(v)).trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}