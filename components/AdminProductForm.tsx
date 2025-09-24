// components/AdminProductForm.tsx
"use client"

import { useState } from "react"

const CATEGORY_OPTIONS = [
  { code: "bv",  label: "Blutonium Vinyls" },
  { code: "sv",  label: "Sonstige Vinyls" },
  { code: "bcd", label: "Blutonium CDs" },
  { code: "scd", label: "Sonstige CDs" },
  { code: "bhs", label: "Blutonium Hardstyle Samples" },
  { code: "ss",  label: "Sonstiges & Specials" },
] as const

const FORMAT_OPTIONS = [
  "CD",
  "Maxi CD",
  "Album",
  "1CD Compilation",
  "2CD Compilation",
  "4CD Compilation",
  "Maxi Vinyl",
  "Album Vinyl LP",
  "Album Vinyl 2LP",
  "DVD",
  "Blu-ray Disc",
  "Sonstiges",
] as const

const CONDITION_OPTIONS = [
  "Neu",
  "Gebraucht",
  "Neuwertig",
  "Starke Gebrauchsspuren",
  "OK",
] as const

export default function AdminProductForm() {
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [priceEUR, setPriceEUR] = useState<number | "">("")
  const [categoryCode, setCategoryCode] = useState<typeof CATEGORY_OPTIONS[number]["code"] | "">("")
  const [format, setFormat] = useState<(typeof FORMAT_OPTIONS)[number] | "">("")
  const [artist, setArtist] = useState("")
  const [releaseTitle, setReleaseTitle] = useState("")
  const [year, setYear] = useState<number | "">("")
  const [upc, setUpc] = useState("")
  const [articleNumber, setArticleNumber] = useState("") // kann später automatisch vergeben werden
  const [condition, setCondition] = useState<(typeof CONDITION_OPTIONS)[number] | "">("")
  const [weightGrams, setWeightGrams] = useState<number | "">("")
  const [active, setActive] = useState(true)

  // bis zu 5 Bilder-URLs (Platzhalter – Upload-API kommt später)
  const [images, setImages] = useState<string[]>(["", "", "", "", ""])

  function autoSlug(v: string) {
    const s = v
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
    setSlug(s)
  }

  function suggestedWeightFor(format: string): number | "" {
    switch (format) {
      case "CD":
      case "1CD Compilation":
        return 120
      case "Maxi CD":
        return 80
      case "2CD Compilation":
        return 180
      case "4CD Compilation":
        return 340
      case "Maxi Vinyl":
        return 250
      case "Album Vinyl LP":
        return 250
      case "Album Vinyl 2LP":
        return 400
      case "DVD":
        return 150
      case "Blu-ray Disc":
        return 120
      default:
        return ""
    }
  }

  function onFormatChange(v: string) {
    setFormat(v as any)
    // nur automatisch befüllen, wenn noch nichts eingetragen wurde:
    if (weightGrams === "" || weightGrams === 0) {
      const w = suggestedWeightFor(v)
      setWeightGrams(w)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Minimal-Validierung
    if (!title || !slug || !priceEUR || !categoryCode) {
      alert("Bitte Titel, Slug, Preis und Kategorie ausfüllen.")
      return
    }

    // Dummy: Hier später POST an /api/admin/products (wird separat gebaut)
    const payload = {
      title,
      slug,
      priceEUR: Number(priceEUR),
      categoryCode,
      format: format || undefined,
      artist: artist || undefined,
      releaseTitle: releaseTitle || undefined,
      year: year ? Number(year) : undefined,
      upc: upc || undefined,
      articleNumber: articleNumber || undefined,
      condition: condition || undefined,
      weightGrams: weightGrams === "" ? undefined : Number(weightGrams),
      images: images.filter(Boolean),
      active,
    }

    console.log("DEBUG new product:", payload)
    alert("Voransicht in Console. API folgt. (Build sollte jetzt passen.)")
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm text-white/70">Produktname *</span>
          <input
            className="mt-1 w-full rounded-md bg-white/10 border border-white/10 px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={(e) => autoSlug(e.target.value)}
            placeholder="z.B. Blutonium Boy – Hardstyle Sample Pack"
          />
        </label>

        <label className="block">
          <span className="text-sm text-white/70">Slug *</span>
          <input
            className="mt-1 w-full rounded-md bg-white/10 border border-white/10 px-3 py-2"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="blutonium-sample-pack"
          />
        </label>

        <label className="block">
          <span className="text-sm text-white/70">Preis (€) *</span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="mt-1 w-full rounded-md bg-white/10 border border-white/10 px-3 py-2"
            value={priceEUR}
            onChange={(e) => setPriceEUR(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="z.B. 39.00"
          />
        </label>

        <label className="block">
          <span className="text-sm text-white/70">Kategorie *</span>
          <select
            className="mt-1 w-full rounded-md bg-white/10 border border-white/10 px-3 py-2"
            value={categoryCode}
            onChange={(e) => setCategoryCode(e.target.value as any)}
          >
            <option value="">— auswählen —</option>
            {CATEGORY_OPTIONS.map(o => (
              <option key={o.code} value={o.code}>{o.label} ({o.code})</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-white/70">Format</span>
          <select
            className="mt-1 w-full rounded-md bg-white/10 border border-white/10 px-3 py-2"
            value={format}
            onChange={(e) => onFormatChange(e.target.value)}
          >
            <option value="">— optional —</option>
            {FORMAT_OPTIONS.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-white/70">Zustand</span>
          <select
            className="mt-1 w-full rounded-md bg-white/10 border border-white/10 px-3 py-2"
            value={condition}
            onChange={(e) => setCondition(e.target.value as any)}
          >
            <option value="">— optional —</option>
            {CONDITION_OPTIONS.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-white/70">Artist (auto-erk.)</span>
          <input
            className="mt-1 w-full rounded-md bg-white/10 border border-white/10 px-3 py-2"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="optional"
          />
        </label>

        <label className="block">
          <span className="text-sm text-white/70">Titel (auto-erk.)</span>
          <input
            className="mt-1 w-full rounded-md bg-white/10 border border-white/10 px-3 py-2"
            value={releaseTitle}
            onChange={(e) => setReleaseTitle(e.target.value)}
            placeholder="optional"
          />
        </label>

        <label className="block">
          <span className="text-sm text-white/70">Erscheinungsjahr</span>
          <input
            type="number"
            className="mt-1 w-full rounded-md bg-white/10 border border-white/10 px-3 py-2"
            value={year}
            onChange={(e) => setYear(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="z.B. 2006"
          />
        </label>

        <label className="block">
          <span className="text-sm text-white/70">UPC/EAN</span>
          <input
            className="mt-1 w-full rounded-md bg-white/10 border border-white/10 px-3 py-2"
            value={upc}
            onChange={(e) => setUpc(e.target.value)}
            placeholder="optional"
          />
        </label>

        <label className="block">
          <span className="text-sm text-white/70">Artikelnummer</span>
          <input
            className="mt-1 w-full rounded-md bg-white/10 border border-white/10 px-3 py-2"
            value={articleNumber}
            onChange={(e) => setArticleNumber(e.target.value)}
            placeholder="wird später automatisch vergeben"
          />
        </label>

        <label className="block">
          <span className="text-sm text-white/70">Gewicht (Gramm)</span>
          <input
            type="number"
            min={0}
            step="1"
            className="mt-1 w-full rounded-md bg-white/10 border border-white/10 px-3 py-2"
            value={weightGrams}
            onChange={(e) => setWeightGrams(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="auto je nach Format oder manuell"
          />
        </label>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-white/70">Bilder (bis zu 5 URLs – Upload folgt)</div>
        <div className="grid sm:grid-cols-2 gap-3">
          {images.map((src, i) => (
            <input
              key={i}
              className="rounded-md bg-white/10 border border-white/10 px-3 py-2"
              value={src}
              onChange={(e) => {
                const copy = [...images]
                copy[i] = e.target.value
                setImages(copy)
              }}
              placeholder={`Bild ${i + 1} URL (optional)`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <span className="text-sm">Aktiv</span>
        </label>

        <button
          type="submit"
          className="ml-auto rounded-md bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-4 py-2"
        >
          Speichern (Demo)
        </button>
      </div>
    </form>
  )
}