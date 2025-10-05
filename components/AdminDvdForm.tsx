// components/AdminDvdForm.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ImageDrop from "./ImageDrop";
import BarcodeScanner from "./BarcodeScanner";

const MOVIE_GENRES = [
  "Action","Abenteuer","Animation","Dokumentation","Drama","Familie",
  "Fantasy","Historie","Horror","Komödie","Krimi","Musik","Mystery",
  "Romantik","Science Fiction","Sport","Thriller","Western"
] as const;

type ProductPayload = {
  slug: string;
  productName?: string;
  subtitle?: string;
  artist?: string;          // Regie wird im artist-Feld gespeichert
  trackTitle?: string;      // bei DVDs leer
  priceEUR: number;
  currency?: string;
  categoryCode: string;     // "dvd" | "bray"
  format?: string;
  year?: number;
  upcEan?: string;
  catalogNumber?: string;
  condition?: string;
  weightGrams?: number;
  isDigital?: boolean;
  sku?: string;
  stock?: number;
  active?: boolean;
  image: string;
  images: string[];
  genre?: string | null;
  fsk?: number | null;      // FSK als Zahl (0/6/12/16/18)
};

export default function AdminDvdForm() {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [images, setImages] = useState<string[]>([]);
  const [filenames, setFilenames] = useState<string[]>([]);

  const [productName, setProductName] = useState("");      // Filmtitel
  const [director, setDirector] = useState("");            // als artist speichern
  const [category, setCategory] = useState<"dvd"|"bray">("dvd"); // dvd | bray
  const [format, setFormat] = useState("DVD");
  const [weight, setWeight] = useState<string>("90");      // typische DVD-Hülle ~90g
  const [condition, setCondition] = useState<string>("");
  const [stock, setStock] = useState<string>("1");
  const [genre, setGenre] = useState<string>("");
  const [fsk, setFsk] = useState<string>("");              // UI-State als String, speichern als Zahl
  const [slugTouched, setSlugTouched] = useState(false);

  const formRef = useRef<HTMLFormElement | null>(null);
  const upcRef = useRef<HTMLInputElement | null>(null);
  const priceRef = useRef<HTMLInputElement | null>(null);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);

  function toSlug(s: string) {
    return s
      .toLowerCase()
      .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }
  function requestSave() { formRef.current?.requestSubmit(); }
  function strOrNull(v: FormDataEntryValue | null) {
    const s = (v == null ? "" : String(v)).trim();
    return s ? s : undefined;
  }
  function numOrNull(v: FormDataEntryValue | null) {
    const s = (v == null ? "" : String(v)).trim();
    if (!s) return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  }

  // "FSK 16" → 16 (akzeptiert auch "16", "FSK16", "16+")
  function normalizeFskToNumber(v?: string | null) {
    const s = (v || "").toUpperCase().replace(/\s+/g, "");
    const m = s.match(/(?:FSK)?(\d{1,2})\+?/);
    if (!m) return undefined;
    const n = parseInt(m[1], 10);
    return [0,6,12,16,18].includes(n) ? n : undefined;
  }

  // ✅ PREFILL aus /admin/dvds/ean übernehmen (sessionStorage)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("dvd_prefill");
      if (!raw) return;
      const p = JSON.parse(raw) as {
        ean?: string;
        title?: string | null;
        year?: number | null;
        director?: string | null;
        genre?: string | null;
        cover?: string | null;
        format?: string;
        categoryCode?: "dvd" | "bray";
        fsk?: number | null;
        edition?: string | null;
      };

      if (p.title) setProductName(p.title);
      if (p.director) setDirector(p.director);
      if (p.genre) setGenre(p.genre);
      if (p.categoryCode) setCategory(p.categoryCode);
      if (p.format) setFormat(p.format || (p.categoryCode === "bray" ? "Blu-ray" : "DVD"));
      if (typeof p.fsk === "number") setFsk(String(p.fsk));
      if (p.cover && images.length === 0) setImages([p.cover]);

      const yearInput = document.querySelector<HTMLInputElement>('input[name="year"]');
      if (yearInput && p.year) yearInput.value = String(p.year);

      const sub = document.querySelector<HTMLInputElement>('input[name="subtitle"]');
      if (sub && p.edition) sub.value = p.edition;

      const upc = document.querySelector<HTMLInputElement>('input[name="upcEan"]');
      if (upc && p.ean) upc.value = p.ean;

      const slugInput = document.querySelector<HTMLInputElement>('input[name="slug"]');
      if (slugInput && !slugInput.value && p.title) {
        const base = `${p.title}${p.year ? ` ${p.year}` : ""}`.trim();
        slugInput.value = toSlug(base);
      }

      setMsg("Daten aus EAN-Scan übernommen ✔");
    } catch {
      // ignore
    } finally {
      try { sessionStorage.removeItem("dvd_prefill"); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Slug auto aus Titel
  useEffect(() => {
    const slugInput = document.querySelector<HTMLInputElement>('input[name="slug"]');
    if (!slugInput || slugTouched) return;
    if (productName && !slugInput.value) slugInput.value = toSlug(productName);
  }, [productName, slugTouched]);

  // Wenn Kategorie wechselt, Format passend setzen (DVD ⇄ Blu-ray)
  useEffect(() => {
    setFormat(category === "bray" ? "Blu-ray" : "DVD");
  }, [category]);

  // --- DVD/BR Lookup --------------------------------------------------------
  const isBlu = (v?: string | null) => !!v && /blu[- ]?ray/i.test(v);

  async function lookupByBarcode(code: string) {
    if (!code || lookupBusy) return;
    setLookupBusy(true);
    setMsg("Suche Metadaten …");
    try {
      const r = await fetch(`/api/utils/lookup-dvd?barcode=${encodeURIComponent(code)}`, { cache: "no-store" });
      const text = await r.text();
      let j: any; try { j = JSON.parse(text); } catch { j = { error: text || "Lookup-Antwort ungültig" }; }

      if (!r.ok) {
        setMsg(j?.error || "Kein Treffer");
        return;
      }

      if (j.title) setProductName(j.title);
      if (j.director) setDirector(j.director);

      if (j.format) {
        setFormat(j.format);
        setCategory(isBlu(j.format) ? "bray" : "dvd");
      }

      if (j.year) {
        const y = document.querySelector<HTMLInputElement>('input[name="year"]');
        if (y) y.value = String(j.year);
      }
      if (j.edition) {
        const sub = document.querySelector<HTMLInputElement>('input[name="subtitle"]');
        if (sub) sub.value = j.edition;
      }
      if (j.genre) setGenre(j.genre);

      // FSK aus Lookup → Zahl
      if (j.fsk) {
        const n = normalizeFskToNumber(j.fsk);
        if (n != null) setFsk(String(n));
      }

      if (j.cover && images.length === 0) setImages([j.cover]);

      const slugInput = document.querySelector<HTMLInputElement>('input[name="slug"]');
      if (slugInput && !slugTouched && (j.title || j.year)) {
        const base = `${j.title || ""} ${j.year || ""}`.trim();
        if (!slugInput.value && base) slugInput.value = toSlug(base);
      }

      setMsg(`Gefunden (${j.source || "lookup"}) ✔`);
    } catch (e: any) {
      setMsg(e?.message || "Lookup-Fehler");
    } finally {
      setLookupBusy(false);
    }
  }

  function handleBarcodeDetected(code: string) {
    if (upcRef.current) upcRef.current.value = code;
    setScannerOpen(false);
    lookupByBarcode(code);
  }

  // Titel/Slug/Jahr/Format/Kategorie aus erstem Bild/Dateinamen übernehmen
  function autofillFromImage() {
    if (!filenames.length && !images.length) return;

    const raw = (filenames[0] || images[0] || "")
      .split("/").pop()?.split("?")[0] || "";
    if (!raw) return;

    const base = raw.replace(/\.[a-z0-9]+$/i, "");
    const nice = base.replace(/[_\.]+/g, " ").trim();

    // Jahr erkennen
    const yr = (nice.match(/\b(19|20)\d{2}\b/) || [])[0];
    if (yr) {
      const yInput = document.querySelector<HTMLInputElement>('input[name="year"]');
      if (yInput) yInput.value = yr;
    }

    // Titel ohne Jahr
    let title = nice;
    if (yr) title = title.replace(new RegExp(`\\b${yr}\\b`), "").trim();
    title = title.replace(/[-]{2,}/g, "-").replace(/\s{2,}/g, " ").trim();

    if (title && !productName) setProductName(title);

    // Format/Kategorie heuristisch
    const looksBlu = /blu[- ]?ray|bray|bluray/i.test(raw);
    setFormat(looksBlu ? "Blu-ray" : "DVD");
    setCategory(looksBlu ? "bray" : "dvd");

    // Slug setzen (wenn nicht berührt)
    const slugInput = document.querySelector<HTMLInputElement>('input[name="slug"]');
    if (slugInput && !slugTouched) {
      const baseSlug = `${title}${yr ? ` ${yr}` : ""}`.trim();
      if (!slugInput.value && baseSlug) slugInput.value = toSlug(baseSlug);
    }
  }

  // --- Submit ---------------------------------------------------------------
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);

    const fd = new FormData(e.currentTarget);
    const payload: ProductPayload = {
      slug: String(fd.get("slug") || "").trim(),
      productName: productName.trim() || undefined,
      subtitle: strOrNull(fd.get("subtitle")),
      artist: director.trim() || undefined,
      trackTitle: undefined,
      priceEUR: Number(fd.get("priceEUR") || 0),
      currency: String(fd.get("currency") || "EUR"),
      categoryCode: String(fd.get("categoryCode") || category),
      format: format.trim() || undefined,
      year: numOrNull(fd.get("year")),
      upcEan: strOrNull(fd.get("upcEan")),
      catalogNumber: strOrNull(fd.get("catalogNumber")),
      condition: strOrNull(fd.get("condition")),
      weightGrams: weight ? Number(weight) : undefined,
      isDigital: fd.get("isDigital") === "on",
      sku: strOrNull(fd.get("sku")),
      stock: Math.max(0, Number(stock) || 1),
      active: fd.get("active") === "on",
      image: images[0] || "",
      images,
      genre: genre || undefined,
      // FSK als Zahl speichern
      fsk: fsk ? normalizeFskToNumber(fsk) ?? null : null,
    };

    if (!payload.slug) return setMsg("Slug ist Pflicht.");
    if (!payload.image) return setMsg("Bitte mindestens ein Bild hinzufügen.");

    setBusy(true);
    try {
      const adminKey =
        (typeof window !== "undefined" && localStorage.getItem("admin_key")) ||
        process.env.NEXT_PUBLIC_ADMIN_TOKEN ||
        "";

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let j: any; try { j = JSON.parse(text); } catch { j = { error: text || "Unknown server error" }; }
      if (!res.ok) throw new Error(j?.error || "Fehler beim Speichern");

      // Reset + zur DVD-Liste
      try { formRef.current?.reset(); } catch {}
      setImages([]); setFilenames([]);
      setProductName(""); setDirector("");
      setCategory("dvd"); setFormat("DVD"); setWeight("90");
      setCondition(""); setSlugTouched(false); setStock("1");
      setGenre(""); setFsk(""); if (priceRef.current) priceRef.current.value = "";

      setMsg("Gespeichert ✔");
      router.push("/admin/dvds");
    } catch (err: any) {
      setMsg(err?.message || "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top-Bar */}
      <div className="sticky top-16 z-30 bg-black/70 backdrop-blur border border-white/10 rounded-xl px-3 py-2 flex flex-wrap items-center gap-2">
        <a href="/admin" className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">Zum Admin</a>
        <a href="/admin/dvds" className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">DVD-Liste</a>
        <button type="button" onClick={requestSave}
          className="px-3 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold" title="Speichern (⌘/Ctrl+S)">
          Speichern
        </button>
        <button type="button" onClick={() => setScannerOpen(true)}
          className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">
          Scanner
        </button>
        <button
          type="button"
          onClick={autofillFromImage}
          className="px-3 py-2 rounded bg-white/10 hover:bg-white/20"
          title="Titel/Slug (und ggf. Jahr/Format) aus Bild/Dateiname übernehmen"
        >
          Aus Bild übernehmen
        </button>
        <button type="button"
          onClick={() => { const code = upcRef.current?.value?.trim(); if (code) lookupByBarcode(code); }}
          className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 disabled:opacity-60"
          disabled={lookupBusy}>
          {lookupBusy ? "Prüfe …" : "EAN übernehmen"}
        </button>

        {/* Kategorie-Schnellwahl (Top-Bar) */}
        <select
          className="ml-2 px-2 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/10"
          value={category}
          onChange={(e) => setCategory(e.target.value as "dvd" | "bray")}
          title="Kategorie wählen"
        >
          <option value="dvd">DVD</option>
          <option value="bray">Blu-ray</option>
        </select>

        {msg && <span className="ml-auto text-sm opacity-80">{msg}</span>}
      </div>

      <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
        <ImageDrop
          max={5}
          initial={[]}
          onChange={(arr, names) => { setImages(arr); setFilenames(names || []); }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <L label="Slug* (auto – kannst du überschreiben)">
            <input
              name="slug"
              className="input"
              placeholder="z. B. the-matrix-1999"
              onInput={(e) => {
                const v = toSlug(e.currentTarget.value || "");
                if (e.currentTarget.value !== v) e.currentTarget.value = v;
                setSlugTouched(true);
              }}
              required
            />
          </L>
          <L label="Filmtitel*">
            <input className="input" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="z. B. The Matrix" required />
          </L>
          <L label="Edition / Zusatz (optional)">
            <input name="subtitle" className="input" placeholder="Steelbook · Extended Cut · 2-Disc …" />
          </L>
          <L label="Regie (optional)">
            <input className="input" value={director} onChange={(e) => setDirector(e.target.value)} placeholder="Regisseur/in" />
          </L>

          <L label="Preis (EUR)*">
            <input name="priceEUR" type="number" step="0.01" min="0" className="input" required ref={priceRef} />
          </L>
          <L label="Währung">
            <input name="currency" className="input" defaultValue="EUR" />
          </L>

          <L label="Kategorie*">
            <select name="categoryCode" className="input" value={category} onChange={(e) => setCategory(e.target.value as "dvd"|"bray")} required>
              <option value="dvd">DVD</option>
              <option value="bray">Blu-ray</option>
            </select>
          </L>

          <L label="Format">
            <input name="format" className="input" value={format} onChange={(e) => setFormat(e.target.value)} placeholder="DVD / Blu-ray" />
          </L>
          <L label="Jahr">
            <input name="year" type="number" className="input" />
          </L>

          <L label="EAN / UPC">
            <div className="flex gap-2">
              <input
                ref={upcRef}
                name="upcEan"
                className="input flex-1"
                placeholder="z. B. 5051890000000"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const code = upcRef.current?.value?.trim(); if (code) lookupByBarcode(code); }}}
                onBlur={() => { const val = upcRef.current?.value?.trim() || ""; if (val && val.length >= 8) lookupByBarcode(val); }}
              />
              <button type="button" className="px-3 rounded bg-cyan-600 hover:bg-cyan-500 text-black font-semibold" onClick={() => setScannerOpen(true)}>Scanner</button>
            </div>
          </L>

          <L label="Katalognummer (optional)">
            <input name="catalogNumber" className="input" />
          </L>

          <L label="Zustand*">
            <select name="condition" className="input" value={condition} onChange={(e) => setCondition(e.target.value)} required>
              <option value="" disabled>neu / gebraucht / …</option>
              <option value="neu">Neu</option>
              <option value="neuwertig">Neuwertig</option>
              <option value="ok">Gebraucht – ok</option>
              <option value="gebraucht">Gebraucht</option>
              <option value="stark">Stark gebraucht</option>
            </select>
          </L>

          <L label="Gewicht (g)">
            <input name="weightGrams" type="number" className="input" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </L>
          <L label="SKU">
            <input name="sku" className="input" />
          </L>

          <L label="Bestand (Stück)*">
            <input name="stock" type="number" min={0} className="input" value={stock} onChange={(e) => setStock(e.target.value)} required />
          </L>
          <L label="Aktiv">
            <input name="active" type="checkbox" defaultChecked />
          </L>
          <L label="Digital?">
            <input name="isDigital" type="checkbox" />
          </L>

          <L label="Film-Genre">
            <select name="genre" className="input" value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option value="">– auswählen –</option>
              {MOVIE_GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </L>

          {/* FSK (numerisch) */}
          <L label="FSK">
            <select name="fsk" className="input" value={fsk} onChange={(e) => setFsk(e.target.value)}>
              <option value="">– auswählen –</option>
              <option value="0">FSK 0</option>
              <option value="6">FSK 6</option>
              <option value="12">FSK 12</option>
              <option value="16">FSK 16</option>
              <option value="18">FSK 18</option>
            </select>
          </L>
        </div>

        {msg && <div className="text-sm">{msg}</div>}

        <div className="flex flex-wrap items-center gap-2">
          <a href="/admin" className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">Zum Admin</a>
          <a href="/admin/dvds" className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">DVD-Liste</a>
          <button type="submit" disabled={busy} className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold disabled:opacity-60">
            {busy ? "Speichere …" : "Speichern"}
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

      {scannerOpen && (
        <BarcodeScanner
          onDetected={(code) => handleBarcodeDetected(code)}
          onClose={() => setScannerOpen(false)}
          formats={["ean_13","ean_8","upc_a","upc_e","code_128"]}
        />
      )}
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
function safeJsonArray(s: string): string[] {
  try { const a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch { return []; }
}