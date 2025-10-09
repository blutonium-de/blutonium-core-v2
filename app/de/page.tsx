// app/de/page.tsx
import Image from "next/image"

export default function HomeDE() {
  // Versandfrei-Schwelle aus ENV (Fallback 50 €)
  const raw = process.env.SHOP_FREE_SHIPPING_MIN
  const freeMin = Number.isFinite(Number(raw)) ? Number(raw) : 50

  return (
    <div className="relative">
      {/* HERO */}
      <section
        className="
          full-bleed relative
          min-h-[clamp(540px,calc(100svh-180px),900px)]
        "
      >
        <div className="absolute inset-0 -z-10">
          <Image
            src="/hero.jpg"
            alt="Blutonium Records Hero"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(80% 60% at 30% 10%, rgba(0,255,255,0.12) 0%, rgba(0,0,0,0) 40%), radial-gradient(80% 60% at 90% 30%, rgba(128,0,255,0.18) 0%, rgba(0,0,0,0) 50%)",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black/80" />
        </div>

        <div className="mx-auto max-w-6xl px-4 py-24 md:py-36">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight drop-shadow">
            Blutonium Records 🚀
          </h1>
          <p className="mt-4 text-white/85 text-lg md:text-xl max-w-3xl">
            Seit 1995 — Hardstyle / Hardtrance / Hard Dance
          </p>
        </div>
      </section>

      {/* 5 BOXEN */}
      <section
        className="
          mx-auto max-w-6xl px-6 pb-10 md:pb-14
          -mt-52 md:-mt-56
          grid gap-6 sm:grid-cols-2 lg:grid-cols-5
        "
      >
        {/* ✅ Mobile Hinweis-Box – nur auf kleinen Screens sichtbar, nimmt volle Breite */}
        <article className="block lg:hidden sm:col-span-2 lg:col-span-5 card">
          <div className="text-sm">
            <div className="font-semibold mb-1">Hinweis</div>
            <p className="opacity-80">
              Auf kleinen Displays findest du unten die Schnellzugriffe zu Releases, Shop und Samples.
            </p>
          </div>
        </article>

        {/* Box 1 */}
        <article className="card flex flex-col items-center justify-center">
          <img
            src="/logo.png"
            alt="Blutonium Records Logo"
            className="w-40 h-40 object-contain select-none"
            draggable={false}
          />
          <p className="mt-3 text-white/70 text-sm">
            Blutonium Records — Seit 1995
          </p>
        </article>

        {/* Box 2 */}
        <article className="card">
          <h2 className="text-2xl font-bold">Neueste Releases</h2>
          <p className="mt-2 text-white/70">
            Der ganze Blutonium Records Katalog von 1995 bis heute mit Links zum Reinhören!
          </p>
          <a href="/de/releases" className="btn mt-4 inline-flex">
            Releases ansehen →
          </a>
        </article>

        {/* Box 3 */}
        <article className="card">
          <h2 className="text-2xl font-bold">Vinyl &amp; CD Shop</h2>
          <p className="mt-2 text-white/70">
            12&quot; Vinyl Maxi Singles, Maxi CDs, Compilations, Neu &amp; Gebraucht zu super Preisen
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-2.5 py-1 text-emerald-200 text-xs">
            <span aria-hidden>🚚</span>
            <span><strong>Versandkostenfrei ab {freeMin.toFixed(0)} €</strong> (AT &amp; EU)</span>
          </div>
          <a href="/de/shop" className="btn mt-4 inline-flex">
            Zum Shop →
          </a>
        </article>

        {/* Box 4 */}
        <article className="card">
          <h2 className="text-2xl font-bold">Hardstyle Samples</h2>
          <p className="mt-2 text-white/70">
            Blutonium präsentiert Hardstyle Samples Vol. 2 — Producer Sound Pack
          </p>
          <a href="/de/shop/hardstyle-samples-vol-2" className="btn mt-4 inline-flex">
            Produkt ansehen →
          </a>
        </article>

        {/* Box 5 */}
        <article className="card opacity-95">
          <h2 className="text-2xl font-bold">Gebrauchte DVDs &amp; Blu-rays</h2>
          <p className="mt-2 text-white/70">
            DVDs &amp; Blu-rays: geprüft, fair bepreist, schnell versendet.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-2.5 py-1 text-emerald-200 text-xs">
            <span aria-hidden>🚚</span>
            <span><strong>Versandkostenfrei ab {freeMin.toFixed(0)} €</strong> (AT &amp; EU)</span>
          </div>
          <a href="/de/shop/dvds" className="btn mt-4 inline-flex">
            Zu DVDs &amp; Blu-rays →
          </a>
        </article>
      </section>
    </div>
  )
}