// app/en/page.tsx
import Image from "next/image"

export default function HomeEN() {
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
            Since 1995 — Hardstyle / Hardtrance / Hard Dance
          </p>
        </div>
      </section>

      {/* 5 BOXES */}
      <section
        className="
          mx-auto max-w-6xl px-4 pb-10 md:pb-14
          -mt-40 md:-mt-44
          grid gap-4 sm:grid-cols-2 lg:grid-cols-5
        "
      >
        {/* Box 1 */}
        <article className="card flex flex-col items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Blutonium Records Logo"
            className="w-40 h-40 object-contain select-none"
            draggable={false}
          />
          <p className="mt-3 text-white/70 text-sm">
            Blutonium Records — Since 1995
          </p>
        </article>

        {/* Box 2 */}
        <article className="card">
          <h2 className="text-2xl font-bold">Latest Releases</h2>
          <p className="mt-2 text-white/70">
            The entire Blutonium Records catalog from 1995 to today with direct links to listen!
          </p>
          <a href="/en/releases" className="btn mt-4 inline-flex">
            See releases →
          </a>
        </article>

        {/* Box 3 */}
        <article className="card">
          <h2 className="text-2xl font-bold">Vinyl &amp; CD Shop</h2>
          <p className="mt-2 text-white/70">
            12&quot; vinyl maxi singles, maxi CDs, compilations — new &amp; used at great prices
          </p>
          <a href="/en/shop" className="btn mt-4 inline-flex">
            Go to shop →
          </a>
        </article>

        {/* Box 4 */}
        <article className="card">
          <h2 className="text-2xl font-bold">Hardstyle Samples</h2>
          <p className="mt-2 text-white/70">
            Blutonium presents Hardstyle Samples Vol. 2 — Producer Sound Pack
          </p>
          <a href="/en/shop/hardstyle-samples-vol-2" className="btn mt-4 inline-flex">
            View product →
          </a>
        </article>

        {/* Box 5 */}
        <article className="card opacity-95">
          <h2 className="text-2xl font-bold">Used DVDs &amp; Blu-rays</h2>
          <p className="mt-2 text-white/70">Offers page coming soon</p>
          <div className="mt-4 inline-flex text-white/40">Coming soon</div>
        </article>
      </section>
    </div>
  )
}