// app/de/shop/page.tsx
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Shop – Blutonium Records",
  description:
    "Vinyls, CDs, Merchandise und Specials. Versandkosten werden live berechnet (inkl. versandfrei ab 100,00 €).",
}

type Cat = { code: string; label: string; hint?: string }

const CATS: Cat[] = [
  { code: "bv",  label: "Blutonium Vinyls" },
  { code: "sv",  label: "Sonstige Vinyls" },
  { code: "bcd", label: "Blutonium CDs" },
  { code: "scd", label: "Sonstige CDs" },
  { code: "bhs", label: "Blutonium Hardstyle Samples" },
  { code: "ss",  label: "Sonstiges & Specials" },
]

export default function ShopPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
        Blutonium Records Shop
      </h1>
      <p className="mt-3 text-white/80">
        Vinyls, CDs, Merchandise und Specials. Versandkosten werden live berechnet
        (inkl. versandfrei ab 100,00 €).
      </p>

      {/* Kategorien */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-3">Kategorien</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATS.map((c) => (
            <a
              key={c.code}
              href={`/de/shop?cat=${c.code}`}
              className="block rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4"
            >
              <div className="text-lg font-semibold">{c.label}</div>
              <div className="mt-1 text-xs text-white/60">Code: <span className="font-mono">{c.code}</span></div>
              {c.hint && <div className="mt-1 text-xs text-white/60">{c.hint}</div>}
            </a>
          ))}
        </div>
      </section>

      {/* Hinweis für dich (Backend/Zuordnung) */}
      <section className="mt-10 text-sm text-white/70">
        <h3 className="font-semibold mb-2">Kürzel-Legende (für Backend-Zuordnung)</h3>
        <ul className="list-disc pl-6 space-y-1 font-mono">
          <li>bv  = Blutonium Vinyls</li>
          <li>sv  = Sonstige Vinyls</li>
          <li>bcd = Blutonium CDs</li>
          <li>scd = Sonstige CDs</li>
          <li>bhs = Blutonium Hardstyle Samples</li>
          <li>ss  = Sonstiges & Specials</li>
        </ul>
      </section>
    </div>
  )
}