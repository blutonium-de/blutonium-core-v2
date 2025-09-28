// app/page.tsx
import Image from "next/image"

export default function Home() {
  return (
    <div className="relative">
      {/* HERO – etwas kürzer, damit die Kästchen sichtbar bleiben */}
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
          {/* Abdunkeln + Color-Wash */}
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(80% 60% at 30% 10%, rgba(0,255,255,0.12) 0%, rgba(0,0,0,0) 40%), radial-gradient(80% 60% at 90% 30%, rgba(128,0,255,0.18) 0%, rgba(0,0,0,0) 50%)",
            }}
          />
          {/* sanfter Fade nach unten */}
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

        <div className="absolute inset-x-0 bottom-4 flex justify-center opacity-70"></div>
      </section>

      {/* 4 KARTEN */}
      <section className="mx-auto max-w-6xl px-4 pb-10 md:pb-14 -mt-10 md:-mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Box 1: Logo (links) */}
        <article className="card flex flex-col items-center justify-center">
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

        {/* Box 2: Releases */}
        <article className="card">
          <h2 className="text-2xl font-bold">Aktuelle Veröffentlichungen</h2>
          <p className="mt-2 text-white/70">
            Alle Radio-Edits mit Cover & direkten Links.
          </p>
          <a href="/de/releases" className="btn mt-4 inline-flex">
            Zu den Releases →
          </a>
        </article>

        {/* Box 3: Merch */}
        <article className="card">
          <h2 className="text-2xl font-bold">Merch & Classics</h2>
          <p className="mt-2 text-white/70">
            CDs, Shirts, Caps & Autogramme.
          </p>
          <a href="/de/shop" className="btn mt-4 inline-flex">
            Zum Shop →
          </a>
        </article>

        {/* Box 4: Samples */}
        <article className="card">
          <h2 className="text-2xl font-bold">Hardstyle Samples</h2>
          <p className="mt-2 text-white/70">
            Blutonium pres. Hardstyle Samples Vol. 1 & 2.
          </p>
          <a href="/de/samples" className="btn mt-4 inline-flex">
            Samples holen →
          </a>
        </article>
      </section>
    </div>
  )
}