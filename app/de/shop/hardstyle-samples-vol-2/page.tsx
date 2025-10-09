// app/de/shop/hardstyle-samples-vol-2/page.tsx
import { prisma } from "@/lib/db"
import Link from "next/link"
import ProductCard from "@/components/ProductCard"

export const dynamic = "force-dynamic"

export default async function HardstyleSamplesPage() {
  // Produkt mit allen Feldern laden, die ProductCard nutzt
  const product = await prisma.product.findUnique({
    where: { slug: "hardstyle-samples-vol-2" },
    select: {
      id: true,
      slug: true,
      artist: true,
      trackTitle: true,
      productName: true,
      subtitle: true,
      categoryCode: true,
      condition: true,
      priceEUR: true,
      image: true,
      images: true,
      stock: true,
      genre: true,
      format: true,
      fsk: true,
      isDigital: true,
      active: true,
    },
  })

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">Hardstyle Samples Vol. 2</h1>
        <p className="opacity-70">⚠️ Produkt nicht gefunden.</p>
        <Link href="/de/shop" className="link mt-4 block">
          Zurück zum Shop →
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-4xl font-extrabold mb-6">
        {product.productName || "Hardstyle Samples Vol. 2"}
      </h1>

      {/* Linke Spalte: ShopCard mit Galerie-Zoom; rechte Spalte: Preis & CTA lassen wir weg, weil in der Card vorhanden */}
      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div className="w-full">
          <div className="mx-auto max-w-[420px]">
            <ProductCard p={product as any} />
          </div>
        </div>

        <div>
          <p className="text-lg text-white/80 mb-4">
            Blutonium präsentiert das ultimative Producer Pack mit Sounds, Kicks,
            Loops und Vocals für Hardstyle / Hardtrance.
          </p>

          {/* Optionaler Zweit-CTA, falls du beides willst (Card hat schon Buttons) */}
          <Link
            href={`/de/cart/add?id=${product.id}&qty=1`}
            className="btn inline-flex"
          >
            In den Warenkorb →
          </Link>
        </div>
      </div>

      {/* DE-Box */}
      <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
        <div className="text-xs uppercase tracking-wide text-white/60 mb-2">DE</div>
        <h2 className="text-2xl font-bold mb-3">Hardstyle Samples</h2>
        <p className="opacity-90">
          <strong>Hardstyle Samples Vol.2</strong> ist die Fortsetzung der weltweit
          erfolgreichsten Hardstyle Sample CD mit neuen genre-typischen Sounds!
        </p>
        <ul className="mt-4 list-disc pl-5 space-y-1 opacity-90">
          <li>massig Bassdrums, sortiert nach Hardstyle, Jumpstyle, Hardcore, Gated, Fx Kicks &amp; Oldschool</li>
          <li>brandneue Hihat-Sounds, Tribal-Sounds, Breakbeat-Sounds, Snares, Claps, Ride-Loops</li>
          <li>über 500 abgefahrene Vocals</li>
          <li>zahlreiche Special FX Explosionen, Sweeps, Experimentalsounds, typische Stab-Hit-Attacksounds</li>
          <li>multigesampelte Synth-Sounds für NN-19</li>
        </ul>
        <p className="mt-4 opacity-90">
          Wer den Vorgänger verpasst hat, kein Problem: Diese DVD enthält die komplette <em>Hardstyle Vol. 1</em>.
        </p>
        <p className="mt-3 opacity-90">
          With this second strike coming directly from the blutonium studios you
          will be able to produce up-to-date tracks in hardstyle, hardtrance,
          hardcore or jumpstyle.
        </p>
        <p className="mt-4 font-semibold opacity-90">Acid – Wav – Dr.Rex – Reason 2.5 Refill</p>
      </section>

      {/* EN-Box */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
        <div className="text-xs uppercase tracking-wide text-white/60 mb-2">EN</div>
        <h2 className="text-2xl font-bold mb-3">Hardstyle Collection</h2>
        <p className="opacity-90">
          The sequel to the most popular Hardstyle sample CD worldwide! With this DVD sample collection you get the newest
          sounds to transform your ideas into hard techno tracks. More than 500 vocals in three different styles are
          included. A multisampled collection of new uniquely sounding synths and especially for reason users&apos; nn-19 format.
        </p>
        <p className="mt-3 opacity-90">
          This sample DVD contains a new large collection of bassdrums cataloged in hardstyle, hardcore, gated bassdrums,
          fx kick, jumpstyle and oldschool. Also more than 140 new drumloops sorted in hihats, tribal, breakbeat, claps,
          snares and rides for more usability. Of course in acidized wave and dr.rex format. A big collection of special
          effects will smooth your production with explosions, sweep effects and experimental stuff. This DVD includes
          special stabhit attack sounds, the essential way to phat up the track rhythmic. With this second strike coming
          directly from the blutonium studios you will be able to produce up-to-date tracks in hardstyle, hardtrance,
          hardcore or jumpstyle.
        </p>
        <p className="mt-3 opacity-90">
          If you missed “blutonium hardstyle samples vol.1”, no problem, this dvd includes the whole vol. 1 sample cd.
        </p>
        <p className="mt-4 font-semibold opacity-90">Acid – Wav – Dr.Rex – Reason 2.5 Refill</p>
      </section>

      {/* Download-Partner */}
      <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
        <div className="text-sm opacity-80">
          <div className="font-semibold mb-1">oder als Download / or as download?</div>
          <p className="opacity-85">
            Kaufe den Download bei unserem Partner Best Service / Buy the download from our partner Best Service
          </p>
        </div>
        <div className="mt-4">
          <a
            href="https://www.bestservice.com/de/hardstyle_samples_vol_2.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 bg-cyan-500 text-black font-semibold hover:bg-cyan-400"
          >
            Buy here →
          </a>
        </div>
      </section>
    </div>
  )
}