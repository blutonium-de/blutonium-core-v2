"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ImageDrop from "../../../../../components/ImageDrop";

// ✅ Nur noch „Dance“ – ohne „Dance & Electronic“
const GENRES = [
  "Hardstyle","Techno","Trance","House","Reggae","Pop","Filmmusik","Dance",
  "Hörspiel","Jazz","Klassik","Country","Italo Disco","Disco","EDM Big Room","Telespiel","DJ Tools"
] as const;

// Genre-Eingaben auf „Dance“ kanonisieren (fasst auch alte Varianten)
function normalizeGenre(v?: string | null) {
  const s = (v || "").trim();
  if (!s) return undefined;
  const canon = s.toLowerCase().replace(/&/g, "and").replace(/\//g, " and ").replace(/\s+/g, " ");
  if (/(^|\s)dance(\s|$)/.test(canon)) return "Dance";
  return s;
}

type Product = {
  id: string;
  slug: string;
  productName?: string | null;
  subtitle?: string | null;
  artist?: string | null;
  trackTitle?: string | null;
  priceEUR: number;
  currency: string;
  categoryCode: string;
  format?: string | null;
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
  stock?: number | null; // Bestand
};

export default function AdminEditProductPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const searchParams = useSearchParams();

  // 🔑 Key robust ermitteln (URL → localStorage → ENV)
  const urlKey = searchParams.get("key") ?? "";
  const lsKey  = typeof window !== "undefined" ? (localStorage.getItem("admin_key") ?? "") : "";
  const envKey = process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? "";
  const adminKey = urlKey || lsKey || envKey;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState<string | null>(null);

  const [p, setP] = useState<Product | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [active, setActive] = useState<boolean>(false);

  const formRef = useRef<HTMLFormElement | null>(null);

  // --------- Helpers ----------
  function submitForm() {
    formRef.current?.requestSubmit();
  }

  useEffect(() => {
    // Cmd/Ctrl + S => speichern
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        submitForm();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Produkt laden
  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);
      try {
        const keyQuery = adminKey ? `?key=${encodeURIComponent(adminKey)}` : "";
        const r = await fetch(`/api/admin/products/${id}${keyQuery}`, {
          cache: "no-store",
          headers: adminKey ? { "x-admin-key": adminKey } : {},
        });
        const t = await r.text();
        let j: any; try { j = JSON.parse(t); } catch { throw new Error(t || "Serverfehler"); }
        if (!r.ok) throw new Error(j?.error || "Produkt nicht gefunden");

        const prod: Product = j;
        // vorhandenes Genre direkt auf Kanon bringen, damit das Select passt
        prod.genre = normalizeGenre(prod.genre) ?? null;

        setP(prod);
        setActive(prod.active);
        setImages(prod.images?.length ? prod.images : (prod.image ? [prod.image] : []));
      } catch (e: any) {
        setMsg(e?.message || "Fehler beim Laden");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, adminKey]);

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
        artist: strOrNull(fd.get("artist")),
        trackTitle: strOrNull(fd.get("trackTitle")),
        priceEUR: Number(fd.get("priceEUR") || 0),
        currency: String(fd.get("currency") || "EUR"),
        categoryCode: String(fd.get("categoryCode") || "ss"),
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
        // ➜ Genre normalisieren
        genre: normalizeGenre(String(fd.get("genre") || "")),
        stock: numOrNull(fd.get("stock")), // Bestand mitsenden
      };

      const keyQuery = adminKey ? `?key=${encodeURIComponent(adminKey)}` : "";
      const r = await fetch(`/api/admin/products/${id}${keyQuery}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(adminKey ? { "x-admin-key": adminKey } : {}),
        },
        body: JSON.stringify(body),
      });

      const t = await r.text();
      let j: any; try { j = JSON.parse(t); } catch { j = { error: t || "Serverfehler" }; }
      if (!r.ok) throw new Error(j?.error || "Speichern fehlgeschlagen");

      // ✅ Nach dem Speichern: exakt zur gemerkten Listen-URL zurück
      try {
        const stored = sessionStorage.getItem("admin:products:returnURL");
        if (stored) {
          window.location.href = stored;
        } else {
          window.location.href = "/admin/products?updated=1";
        }
      } catch {
        window.location.href = "/admin/products?updated=1";
      }
    } catch (e: any) {
      setMsg(e?.message || "Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    if (!p) return;
    const next = !active;
    setActive(next);
    setMsg(null);
    try {
      const keyQuery = adminKey ? `?key=${encodeURIComponent(adminKey)}` : "";
      const r = await fetch(`/api/admin/products/${id}${keyQuery}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(adminKey ? { "x-admin-key": adminKey } : {}),
        },
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

  async function handleDelete() {
    if (!p) return;
    const really = window.confirm("Wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.");
    if (!really) return;

    try {
      const keyQuery = adminKey ? `?key=${encodeURIComponent(adminKey)}` : "";
      const r = await fetch(`/api/admin/products/${id}${keyQuery}`, {
        method: "DELETE",
        headers: adminKey ? { "x-admin-key": adminKey } : {},
      });
      if (!r.ok) {
        const t = await r.text();
        let j: any; try { j = JSON.parse(t); } catch { j = { error: t || "Serverfehler" }; }
        throw new Error(j?.error || "Löschen fehlgeschlagen");
      }
      // auch beim Löschen: zurück zur gemerkten Liste
      try {
        const stored = sessionStorage.getItem("admin:products:returnURL");
        if (stored) {
          window.location.href = stored;
        } else {
          window.location.href = "/admin/products?deleted=1";
        }
      } catch {
        window.location.href = "/admin/products?deleted=1";
      }
    } catch (e:any) {
      setMsg(e?.message || "Fehler beim Löschen");
    }
  }

  // Hilfsfunktion: „Zur Liste“ klick – nutzt gemerkte URL
  function goBackToList() {
    try {
      const stored = sessionStorage.getItem("admin:products:returnURL");
      if (stored) {
        window.location.href = stored;
      } else {
        window.location.href = "/admin/products";
      }
    } catch {
      window.location.href = "/admin/products";
    }
  }

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-10">Lade …</div>;
  if (!p)      return <div className="max-w-6xl mx-auto px-4 py-10 text-red-400">{msg || "Produkt nicht gefunden"}</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold">Produkt bearbeiten</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* nutzt die gemerkte Liste */}
          <button
            type="button"
            onClick={goBackToList}
            className="px-3 py-2 rounded bg-white/10 hover:bg-white/20"
          >
            Zur Liste
          </button>

          {/* Speichern oben (kein Scanner im Edit!) */}
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
          <ImageDrop
            max={5}
            initial={images}
            onChange={(arr) => setImages(arr)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <L label="Slug*">
              <input name="slug" defaultValue={p.slug} className="input" required />
            </L>
            <L label="Produktname (optional)">
              <input name="productName" defaultValue={p.productName || ""} className="input" />
            </L>
            <L label="Subtitle">
              <input name="subtitle" defaultValue={p.subtitle || ""} className="input" />
            </L>
            <L label="Artist">
              <input name="artist" defaultValue={p.artist || ""} className="input" />
            </L>
            <L label="TrackTitle">
              <input name="trackTitle" defaultValue={p.trackTitle || ""} className="input" />
            </L>

            <L label="Preis (EUR)*">
              <input name="priceEUR" type="number" step="0.01" min="0" defaultValue={p.priceEUR} className="input" required />
            </L>
            <L label="Währung">
              <input name="currency" defaultValue={p.currency || "EUR"} className="input" />
            </L>

            <L label="Kategorie-Code*">
              <select name="categoryCode" defaultValue={p.categoryCode} className="input" required>
                <option value="bv">Blutonium Vinyls</option>
                <option value="sv">Sonstige Vinyls</option>
                <option value="bcd">Blutonium CDs</option>
                <option value="scd">Sonstige CDs</option>
                <option value="bhs">Blutonium Hardstyle Samples</option>
                <option value="ss">Sonstiges & Specials</option>
              </select>
            </L>

            <L label="Format">
              <input name="format" defaultValue={p.format || ""} className="input" />
            </L>
            <L label="Jahr">
              <input name="year" type="number" defaultValue={p.year ?? ""} className="input" />
            </L>
            <L label="UPC/EAN">
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

            {/* GENRE */}
            <L label="Music Genre">
              <select name="genre" defaultValue={p.genre || ""} className="input">
                <option value="">– auswählen –</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </L>

            {/* Bestand */}
            <L label="Bestand (Stück)">
              <input
                name="stock"
                type="number"
                min={0}
                defaultValue={p.stock ?? 1}
                className="input"
              />
            </L>
          </div>

          {msg && <div className="text-sm">{msg}</div>}

          {/* Untere Buttonleiste */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold disabled:opacity-60"
              title="Speichern"
            >
              {saving ? "Speichere …" : "Speichern & Zur Liste"}
            </button>

            {/* nutzt die gemerkte Liste */}
            <button
              type="button"
              onClick={goBackToList}
              className="px-3 py-2 rounded bg-white/10 hover:bg-white/20"
              title="Zurück zur Liste"
            >
              Zurück zur Liste
            </button>
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