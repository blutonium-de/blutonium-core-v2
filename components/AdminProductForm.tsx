"use client"

import { useMemo, useRef, useState } from "react"
import { CATEGORY_MAP, CategoryCode, CONDITIONS, FORMAT_DEFAULT_WEIGHT, ProductFormat } from "@/lib/catalog"

type ResizedImage = {
  nameBase: string
  full500Url: string
  thumb250Url: string
  fullBlob: Blob
  thumbBlob: Blob
}

function parseArtistTitle(fileName: string) {
  // Beispiel: "Artist - Titel.jpg" -> { artist, title }
  const base = fileName.replace(/\.[a-z0-9]+$/i, "")
  const m = base.split(" - ")
  if (m.length >= 2) {
    return { artist: m[0].trim(), title: m.slice(1).join(" - ").trim() }
  }
  return { artist: "", title: "" }
}

async function readFileAsImage(file: File): Promise<HTMLImageElement> {
  const dataUrl = await file.arrayBuffer().then((b) => {
    const blob = new Blob([new Uint8Array(b)], { type: file.type || "image/*" })
    return URL.createObjectURL(blob)
  })
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

function drawToCanvas(img: HTMLImageElement, size: number): HTMLCanvasElement {
  const c = document.createElement("canvas")
  c.width = size
  c.height = size
  const ctx = c.getContext("2d")!
  // quadratisch einpassen (center-crop)
  const minSide = Math.min(img.width, img.height)
  const sx = (img.width - minSide) / 2
  const sy = (img.height - minSide) / 2
  ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size)
  return c
}

async function canvasToJpegBlob(canvas: HTMLCanvasElement, quality = 0.9): Promise<Blob> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", quality))
}

function toSlug(s: string) {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function genArticleNumber(prefix = "ART") {
  // fortlaufend grob: Datum + Zufall (ohne Server/DB)
  const now = new Date()
  const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14) // YYYYMMDDhhmmss
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}-${stamp}-${rnd}`
}

export default function AdminProductForm() {
  const [files, setFiles] = useState<File[]>([])
  const [images, setImages] = useState<ResizedImage[]>([])
  const [artist, setArtist] = useState("")
  const [trackTitle, setTrackTitle] = useState("")
  const [productName, setProductName] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [format, setFormat] = useState<ProductFormat | "">("")
  const [year, setYear] = useState<number | "">("")
  const [upc, setUpc] = useState("")
  const [categoryCode, setCategoryCode] = useState<CategoryCode | "">("")
  const [condition, setCondition] = useState<string>("Neu")
  const [price, setPrice] = useState<number | "">("")
  const [weight, setWeight] = useState<number | "">("")
  const [articleNumber, setArticleNumber] = useState(genArticleNumber("BLU"))
  const [previewJson, setPreviewJson] = useState("")

  const inputRef = useRef<HTMLInputElement>(null)

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const f = Array.from(e.target.files || []).slice(0, 5)
    setFiles(f)
  }

  async function handleProcess() {
    if (!files.length) return
    const out: ResizedImage[] = []
    for (const file of files) {
      const img = await readFileAsImage(file)
      const base = file.name.replace(/\.[a-z0-9]+$/i, "")
      const c500 = drawToCanvas(img, 500)
      const c250 = drawToCanvas(img, 250)
      const b500 = await canvasToJpegBlob(c500, 0.9)
      const b250 = await canvasToJpegBlob(c250, 0.9)
      // Zielnamen (lege sie später manuell in /public/shop/ ab)
      const safe = toSlug(base)
      const fullName = `${safe}-500.jpg`
      const thumbName = `${safe}-250.jpg`
      out.push({
        nameBase: safe,
        full500Url: `/shop/${fullName}`,
        thumb250Url: `/shop/${thumbName}`,
        fullBlob: b500,
        thumbBlob: b250,
      })
      // Downloads anstoßen
      triggerDownload(b500, fullName)
      triggerDownload(b250, thumbName)
    }
    setImages(out)

    // Artist/Titel Vorschlag aus erstem Dateinamen
    if (!artist || !trackTitle) {
      const { artist: a, title: t } = parseArtistTitle(files[0].name)
      if (!artist && a) setArtist(a)
      if (!trackTitle && t) setTrackTitle(t)
    }
  }

  function triggerDownload(blob: Blob, filename: string) {
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // Gewicht automatisch aus Format
  const autoWeight = useMemo(() => {
    if (!format) return 0
    return FORMAT_DEFAULT_WEIGHT[format as ProductFormat] ?? 0
  }, [format])

  // JSON Vorschau
  function buildJson() {
    const baseName = productName || `${artist ? artist + " – " : ""}${trackTitle || "Produkt"}`
    const id = toSlug(baseName)
    const slug = id
    const imgMain = images[0]?.full500Url || ""

    const json = {
      id,
      slug,
      title: baseName,
      subtitle: subtitle || undefined,
      priceEUR: typeof price === "number" ? price : Number(price || 0),
      currency: "EUR" as const,
      image: imgMain,
      images: images.map(i => ({ full500: i.full500Url, thumb250: i.thumb250Url })),
      tags: [],
      active: true,

      artist: artist || null,
      trackTitle: trackTitle || null,
      format: (format || undefined) as ProductFormat | undefined,
      year: year ? Number(year) : null,
      upcEan: upc || null,
      articleNumber,
      categoryCode: (categoryCode || undefined) as CategoryCode | undefined,
      weightGrams: (weight !== "" ? Number(weight) : (autoWeight || 0)) || null,
      condition: (condition || undefined) as any,
      isDigital: false,
      stripePriceId: null,
    }

    setPreviewJson(JSON.stringify(json, null, 2))
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Produkt anlegen</h1>

      {/* Upload */}
      <div className="rounded-xl border border-white/10 p-4 mb-6 bg-white/5">
        <div className="flex items-center gap-3 mb-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onPickFiles}
            className="hidden"
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="px-3 py-2 rounded bg-white/10 border border-white/10 hover:bg-white/20"
          >
            Bilder auswählen (max. 5)
          </button>
          <button
            onClick={handleProcess}
            disabled={!files.length}
            className="px-3 py-2 rounded bg-cyan-700/30 border border-cyan-400/30 hover:bg-cyan-700/40 disabled:opacity-50"
          >
            Bilder verkleinern & herunterladen
          </button>
          <span className="text-sm opacity-70">Erstellt 500×500 und 250×250 JPEGs</span>
        </div>

        {!!files.length && (
          <ul className="text-sm opacity-80 list-disc pl-5 space-y-1">
            {files.map(f => <li key={f.name}>{f.name} ({Math.round(f.size/1024)} KB)</li>)}
          </ul>
        )}
      </div>

      {/* Felder */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded border border-white/10 p-4">
          <h2 className="font-semibold mb-3">Basis</h2>
          <label className="block text-sm mb-2">Produktname</label>
          <input value={productName} onChange={e=>setProductName(e.target.value)} className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 mb-3"/>

          <label className="block text-sm mb-2">Untertitel</label>
          <input value={subtitle} onChange={e=>setSubtitle(e.target.value)} className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 mb-3"/>

          <label className="block text-sm mb-2">Preis (€)</label>
          <input type="number" min="0" step="0.01" value={price as any} onChange={e=>setPrice(e.target.value === "" ? "" : Number(e.target.value))} className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"/>
        </div>

        <div className="rounded border border-white/10 p-4">
          <h2 className="font-semibold mb-3">Musik-Felder</h2>
          <label className="block text-sm mb-2">Artist (auto aus Dateiname möglich)</label>
          <input value={artist} onChange={e=>setArtist(e.target.value)} className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 mb-3"/>

          <label className="block text-sm mb-2">Titel (auto aus Dateiname möglich)</label>
          <input value={trackTitle} onChange={e=>setTrackTitle(e.target.value)} className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 mb-3"/>

          <label className="block text-sm mb-2">Format</label>
          <select value={format} onChange={e=>setFormat(e.target.value as any)} className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 mb-3">
            <option value="">– nicht gesetzt –</option>
            {Object.keys(FORMAT_DEFAULT_WEIGHT).map(k => <option key={k} value={k}>{k}</option>)}
          </select>

          <label className="block text-sm mb-2">Erscheinungsjahr</label>
          <input type="number" value={year as any} onChange={e=>setYear(e.target.value === "" ? "" : Number(e.target.value))} className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 mb-3"/>

          <label className="block text-sm mb-2">UPC/EAN</label>
          <input value={upc} onChange={e=>setUpc(e.target.value)} className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"/>
        </div>

        <div className="rounded border border-white/10 p-4">
          <h2 className="font-semibold mb-3">Shop & Versand</h2>
          <label className="block text-sm mb-2">Kategorie-Kürzel</label>
          <select value={categoryCode} onChange={e=>setCategoryCode(e.target.value as any)} className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 mb-2">
            <option value="">– nicht gesetzt –</option>
            {Object.entries(CATEGORY_MAP).map(([code, name]) => (
              <option key={code} value={code}>{code} — {name}</option>
            ))}
          </select>
          <p className="text-xs opacity-70 mb-3">
            Legende: {Object.entries(CATEGORY_MAP).map(([c,n]) => `${c}=${n}`).join(" • ")}
          </p>

          <label className="block text-sm mb-2">Zustand</label>
          <select value={condition} onChange={e=>setCondition(e.target.value)} className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 mb-3">
            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <label className="block text-sm mb-2">Gewicht (g)</label>
          <div className="flex gap-2 items-center mb-3">
            <input
              type="number"
              value={weight as any}
              onChange={e=>setWeight(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"
            />
            <button
              type="button"
              onClick={()=> setWeight(autoWeight || 0)}
              className="px-3 py-2 rounded bg-white/10 border border-white/10 hover:bg-white/20"
              title="Gewicht aus Format übernehmen"
            >
              aus Format ({autoWeight} g)
            </button>
          </div>

          <label className="block text-sm mb-2">Artikelnummer</label>
          <div className="flex gap-2">
            <input value={articleNumber} onChange={e=>setArticleNumber(e.target.value)} className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"/>
            <button
              type="button"
              onClick={()=> setArticleNumber(genArticleNumber("BLU"))}
              className="px-3 py-2 rounded bg-white/10 border border-white/10 hover:bg-white/20"
              title="Neue Nummer erzeugen"
            >
              neu
            </button>
          </div>
        </div>

        <div className="rounded border border-white/10 p-4">
          <h2 className="font-semibold mb-3">Bilder-Vorschau</h2>
          {!images.length && <div className="text-sm opacity-70">Noch keine verkleinerten Bilder. Erst „Bilder verkleinern & herunterladen“ klicken.</div>}
          <div className="grid grid-cols-3 gap-3">
            {images.map(img => (
              <div key={img.nameBase} className="text-center">
                <img src={img.thumb250Url} alt={img.nameBase} className="rounded mb-2 border border-white/10" />
                <div className="text-xs opacity-70 break-all">{img.nameBase}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={buildJson}
          className="px-4 py-2 rounded bg-cyan-700/30 border border-cyan-400/30 hover:bg-cyan-700/40"
        >
          JSON erzeugen
        </button>
      </div>

      {!!previewJson && (
        <div className="mt-4">
          <h2 className="font-semibold mb-2">JSON für <code>data/products.json</code></h2>
          <p className="text-xs opacity-70 mb-2">
            Diesen Block in das Array einfügen. <br />
            Leere Felder erscheinen später im Shop **nicht** (du hast alles optional gestaltet).
          </p>
          <pre className="whitespace-pre-wrap text-xs bg-black/40 border border-white/10 rounded p-3">
            {previewJson}
          </pre>
        </div>
      )}
    </div>
  )
}