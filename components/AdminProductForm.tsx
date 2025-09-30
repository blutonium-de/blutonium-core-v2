// components/AdminProductForm.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ImageDrop from "./ImageDrop";
import BarcodeScanner from "./BarcodeScanner";

const GENRES = [
  "Hardstyle","Techno","Trance","House","Reggae","Pop","Film",
  "Dance","Hörspiel","Jazz","Klassik","Country",
  "Italo Disco","Disco","EDM","Hip Hop",
] as const;

type ProductPayload = {
  slug: string;
  productName?: string;
  subtitle?: string;
  artist?: string;
  trackTitle?: string;
  priceEUR: number;
  currency?: string;
  categoryCode: string;
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
  genre?: string | null; // ⬅️ NEU
};

export default function AdminProductForm() {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [images, setImages] = useState<string[]>([]);
  const [filenames, setFilenames] = useState<string[]>([]);

  const [productName, setProductName] = useState("");
  const [artist, setArtist] = useState("");
  const [trackTitle, setTrackTitle] = useState("");
  const [category, setCategory] = useState("sv"); // Default
  const [format, setFormat] = useState("");
  const [weight, setWeight] = useState<string>("");
  const [condition, setCondition] = useState<string>("");
  const [stock, setStock] = useState<string>("1");
  const [genre, setGenre] = useState<string>(""); // ⬅️ NEU
  const [slugTouched, setSlugTouched] = useState(false);

  const formRef = useRef<HTMLFormElement | null>(null);
  const upcRef = useRef<HTMLInputElement | null>(null);
  const priceRef = useRef<HTMLInputElement | null>(null);

  const [scannerOpen, setScannerOpen] = useState(false);

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
  function toSlug(s: string) {
    return s
      .toLowerCase()
      .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  useEffect(() => {
    if (!productName || artist || trackTitle) return;
    const parts = productName.split(/\s[-–—]\s|[-–—]/);
    if (parts.length >= 2) {
      const a = parts[0]?.trim();
      const t = parts.slice(1).join(" - ").trim();
      if (a && t) {
        setArtist(a);
        setTrackTitle(t);
      }
    }
  }, [productName, artist, trackTitle]);

  useEffect(() => {
    const isVinyl = category === "bv" || category === "sv" || /vinyl|lp/i.test(format);
    if (isVinyl && !weight) setWeight("150");
  }, [category, format, weight]);

  useEffect(() => {
    const slugInput = document.querySelector<HTMLInputElement>('input[name="slug"]');
    if (!slugInput || slugTouched) return;

    const baseName =
      productName ||
      (artist && trackTitle ? `${artist} – ${trackTitle}` : "") ||
      "";

    if (baseName && !slugInput.value) {
      slugInput.value = toSlug(baseName);
    }
  }, [artist, trackTitle, productName, slugTouched]);

  useEffect(() => {
    const isVinyl = category === "bv" || category === "sv" || /vinyl|lp/i.test(format);
    const usedConditions = ["ok", "gebraucht", "stark"];
    const isUsed = usedConditions.includes((condition || "").toLowerCase());
    if (isVinyl && isUsed && priceRef.current) {
      const cur = parseFloat(priceRef.current.value || "0");
      if (!cur) priceRef.current.value = "9.90";
    }
  }, [condition, category, format]);

  async function lookupByBarcode(code: string) {
    if (!code) return;
    setMsg(null);
    try {
      const r = await fetch(`/api/utils/lookup?barcode=${encodeURIComponent(code)}`, { cache: "no-store" });
      const text = await r.text();
      let j: any; try { j = JSON.parse(text); } catch { j = { error: text || "Lookup Antwort ungültig" }; }

      if (!r.ok) {
        setMsg(j?.error || "Kein Treffer");
        return;
      }

      if (j.artist) setArtist(j.artist);
      if (j.title) {
        setTrackTitle(j.title);
        if (!productName) setProductName(`${j.artist ? j.artist + " – " : ""}${j.title}`);
      }
      if (j.format) setFormat(j.format);

      if (j.catno) {
        const cat = document.querySelector<HTMLInputElement>('input[name="catalogNumber"]');
        if (cat) cat.value = j.catno;
      }
      if (j.year) {
        const y = document.querySelector<HTMLInputElement>('input[name="year"]');
        if (y) y.value = String(j.year);
      }

      if (j.cover && images.length === 0) setImages([j.cover]);

      const slugInput = document.querySelector<HTMLInputElement>('input[name="slug"]');
      if (slugInput && !slugTouched && (j.artist || j.title)) {
        const base = `${j.artist || ""} ${j.title || ""} ${j.year || ""}`.trim();
        const slug = base
          .toLowerCase()
          .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        if (!slugInput.value && slug) slugInput.value = slug;
      }

      setMsg(`Gefunden (${j.source}) ✔`);
    } catch (e: any) {
      setMsg(e?.message || "Lookup Fehler");
    }
  }

  function handleBarcodeDetected(code: string) {
    if (upcRef.current) upcRef.current.value = code;
    setScannerOpen(false);
    lookupByBarcode(code);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);

    const form = e.currentTarget;
    const fd = new FormData(form);

    const payload: ProductPayload = {
      slug: String(fd.get("slug") || "").trim(),
      productName: productName.trim() || undefined,
      subtitle: strOrNull(fd.get("subtitle")),
      artist: artist.trim() || undefined,
      trackTitle: trackTitle.trim() || undefined,
      priceEUR: Number(fd.get("priceEUR") || 0),
      currency: String(fd.get("currency") || "EUR"),
      categoryCode: category,
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
      image: images[0] || String(fd.get("image") || ""),
      images: images.length ? images : safeJsonArray(String(fd.get("imagesJson") || "[]")),
      genre: genre || undefined, // ⬅️ NEU
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

      try { formRef.current?.reset(); } catch {}
      setImages([]); setFilenames([]);
      setProductName(""); setArtist(""); setTrackTitle("");
      setCategory("sv"); setFormat(""); setWeight("");
      setCondition(""); setSlugTouched(false); setStock("1");
      setGenre(""); // reset
      if (priceRef.current) priceRef.current.value = "";

      setMsg("Gespeichert ✔");
      router.push("/admin/products");
    } catch (err: any) {
      setMsg(err?.message || "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
      <ImageDrop
        max={5}
        initial={[]}
        onChange={(arr, names) => {
          setImages(arr);
          setFilenames(names || []);
          if ((!artist && !trackTitle && !productName) && names && names[0]) {
            const base = names[0].replace(/\.[a-z0-9]+$/i, "").trim();
            const generic = /^photo[-_]\d+$/i.test(base) || /^\d+$/.test(base);
            if (!generic) {
              const parts = base.split(/\s[-–—]\s|[-–—]/);
              if (parts.length >= 2) {
                const a = parts[0]?.trim();
                const t = parts.slice(1).join(" - ").trim();
                if (a && t) {
                  setArtist(a);
                  setTrackTitle(t);
                  setProductName(`${a} – ${t}`);
                }
              }
            }
          }
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <L label="Slug* (auto — du kannst überschreiben)">
          <input
            name="slug"
            className="input"
            placeholder="z. B. artist-title-2024"
            onInput={() => setSlugTouched(true)}
            required
          />
        </L>
        <L label="Produktname (optional)">
          <input className="input" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Artist – Titel" />
        </L>
        <L label="Subtitle">
          <input name="subtitle" className="input" placeholder="zusätzliche Info" />
        </L>
        <L label="Artist">
          <input className="input" value={artist} onChange={(e) => setArtist(e.target.value)} />
        </L>
        <L label="TrackTitle">
          <input className="input" value={trackTitle} onChange={(e) => setTrackTitle(e.target.value)} />
        </L>

        <L label="Preis (EUR)*">
          <input ref={priceRef} name="priceEUR" type="number" step="0.01" min="0" className="input" required />
        </L>
        <L label="Währung">
          <input name="currency" className="input" defaultValue="EUR" />
        </L>

        <L label="Kategorie-Code*">
          <select name="categoryCode" className="input" value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value="bv">Blutonium Vinyls</option>
            <option value="sv">Sonstige Vinyls</option>
            <option value="bcd">Blutonium CDs</option>
            <option value="scd">Sonstige CDs</option>
            <option value="bhs">Blutonium Hardstyle Samples</option>
            <option value="ss">Sonstiges & Specials</option>
          </select>
        </L>

        <L label="Format">
          <input name="format" className="input" placeholder="z. B. Vinyl 12''" value={format} onChange={(e) => setFormat(e.target.value)} />
        </L>
        <L label="Jahr">
          <input name="year" type="number" className="input" />
        </L>

        <L label="UPC/EAN">
          <div className="flex gap-2">
            <input ref={upcRef} name="upcEan" className="input flex-1" />
            <button
              type="button"
              className="px-3 rounded bg-cyan-600 hover:bg-cyan-500 text-black font-semibold"
              onClick={() => setScannerOpen(true)}
            >
              Scanner
            </button>
          </div>
        </L>

        <L label="Katalognummer">
          <input name="catalogNumber" className="input" />
        </L>

        <L label="Zustand*">
          <select
            name="condition"
            className="input"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            required
          >
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
          <input
            name="stock"
            type="number"
            min={0}
            className="input"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="1"
            required
          />
        </L>
        <L label="Aktiv">
          <input name="active" type="checkbox" defaultChecked />
        </L>
        <L label="Digital?">
          <input name="isDigital" type="checkbox" />
        </L>

        {/* GENRE (Dropdown) */}
        <L label="Music Genre">
          <select
            name="genre"
            className="input"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          >
            <option value="">– auswählen –</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </L>
      </div>

      {msg && <div className="text-sm">{msg}</div>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold disabled:opacity-60"
        >
          {busy ? "Speichere …" : "Speichern"}
        </button>
        <a
          href="/admin/products"
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
        >
          Zur Liste
        </a>
      </div>

      {scannerOpen && (
        <BarcodeScanner
          onDetected={(code) => handleBarcodeDetected(code)}
          onClose={() => setScannerOpen(false)}
          formats={["ean_13", "ean_8", "upc_a", "upc_e", "code_128"]}
        />
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
    </form>
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
  try {
    const a = JSON.parse(s);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}