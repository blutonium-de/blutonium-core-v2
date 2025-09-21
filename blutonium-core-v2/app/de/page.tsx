import Link from 'next/link'
export default function Page(){
  return (
    <section className="space-y-10">
      <div className="text-center py-20">
        <h1 className="text-5xl font-extrabold tracking-tight">Blutonium Records</h1>
        <p className="mt-4 text-lg opacity-90">Since 1995 — Hardstyle / Hardtrance / Hard Dance</p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link className="btn" href="/de/releases">Releases</Link>
          <Link className="btn" href="/de/merch">Merch</Link>
          <Link className="btn" href="/de/videos">YouTube</Link>
        </div>
      </div>
    </section>
  )
}
