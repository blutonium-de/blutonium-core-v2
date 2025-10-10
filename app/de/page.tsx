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
          {/* ⬇ Overlays nehmen keine Pointer-Events mehr an */}
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(80% 60% at 30% 10%, rgba(0,255,255,0.12) 0%, rgba(0,0,0,0) 40%), radial-gradient(80% 60% at 90% 30%, rgba(128,0,255,0.18) 0%, rgba(0,0,0,0) 50%)",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black/80 pointer-events-none" />
        </div>

        <div className="mx-auto max-w-6xl px-4 py-24 md:py-35">
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
          -mt-60 md:-mt-56
          grid gap-6 sm:grid-cols-2 lg:grid-cols-5
          relative z-10
        "
      >
        {/* ✅ Mobile Hinweis-Box – nur auf kleinen Screens sichtbar, nimmt volle Breite */}
        <article className="block lg:hidden sm:col-span-2 lg:col-span-5 card">
          <div className="text-sm">
            <div className="font-semibold mb-2">Schnellzugriff / Quick Access</div>
            <p className="opacity-80">
              DJ Vinyl Shop, Releases on Blutonium Records und den Shop für gebrauchte DVDs und Blu-rays.
            </p>

            {/* Quick-Links mit Bildern (nur Mobile) */}
            <div className="mt-3 grid grid-cols-3 gap-3">
              <a href="/de/shop" className="block">
                <img
                  src="/mobile/shop-vinyl.png"
                  alt="Zum Shop – Gebrauchte DJ Vinyl"
                  className="w-full h-20 object-contain rounded-md"
                />
              </a>
              <a href="/de/releases" className="block">
                <img
                  src="/mobile/releases.png"
                  alt="Releases auf Blutonium Records"
                  className="w-full h-20 object-contain rounded-md"
                />
              </a>
              <a href="/de/shop/dvds" className="block">
                <img
                  src="/mobile/dvds.png"
                  alt="Gebrauchte DVDs & Blu-rays"
                  className="w-full h-20 object-contain rounded-md"
                />
              </a>
            </div>
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
            Der legendäre und ganze Blutonium Records Katalog beginnend von 1995 bis heute mit Links zum Reinhören!
          </p>
          <a href="/de/releases" className="btn mt-4 inline-flex">
            Releases ansehen →
          </a>
        </article>

        {/* Box 3 */}
        <article className="card">
          <h2 className="text-2xl font-bold">DJ Maxi Vinyls &amp; CD Shop</h2>
          <p className="mt-2 text-white/70">
            2nd Hand 12&quot; Vinyl Maxi Singles, Maxi CDs, Compilations, Neu &amp; Gebraucht zu super Preisen
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
          <h2 className="text-2xl font-bold">For Producers !! Hardstyle Samples</h2>
          <p className="mt-2 text-white/70">
            Blutonium präsentiert Hardstyle Samples Vol. 2 — Producer Sound Pack - als DVD oder Download
          </p>
          <a href="/de/shop/hardstyle-samples-vol-2" className="btn mt-4 inline-flex">
            Produkt ansehen →
          </a>
        </article>

        {/* Box 5 */}
        <article className="card opacity-95">
          <h2 className="text-2xl font-bold">DVDs &amp; Blu-rays, 2nd Hand zum Top Preis</h2>
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