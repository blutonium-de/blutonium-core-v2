// app/en/page.tsx
export const dynamic = "force-dynamic";

export default function HomeEN() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* HERO */}
      <section className="min-h-[60vh] flex flex-col justify-end pt-24 pb-16 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Blutonium Records
        </h1>
        <p className="mt-3 text-white/80">
          Since 1995 — Hardstyle / Hardtrance / Hard Dance
        </p>
        <p className="mt-6 text-base md:text-lg text-white/80 max-w-3xl mx-auto">
          Welcome to the official site. Explore our latest releases, book artists,
          and browse rare vinyl & CDs in the shop.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="/en/releases" className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10">
            Releases
          </a>
          <a href="/en/artists" className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10">
            Artists & Booking
          </a>
          <a href="/en/shop" className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold">
            Visit Shop
          </a>
          <a href="/en/videos" className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10">
            Videos
          </a>
        </div>
      </section>
    </div>
  );
}