// app/de/hardstyle-samples/page.tsx
import { prisma } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

function scoreForOrder(p: { slug: string | null; productName: string | null }) {
  const s = `${p.slug ?? ""} ${p.productName ?? ""}`.toLowerCase();
  const isDownload = s.includes("download");
  const isVol2 = /(vol[\.\s-]*2|vol-2|vol\.2|vol2)/i.test(s);
  const isVol1 = /(vol[\.\s-]*1|vol-1|vol\.1|vol1)/i.test(s);

  if (isVol2 && !isDownload) return 1;      // links
  if (isDownload) return 2;                 // mitte
  if (isVol1) return 3;                     // rechts
  return 10;                                // sonst hinten anstellen
}

export default async function HardstyleSamplesPage() {
  const rows = await prisma.product.findMany({
    where: {
      OR: [
        {
          AND: [
            { productName: { contains: "hardstyle", mode: "insensitive" } },
            { productName: { contains: "samples", mode: "insensitive" } },
          ],
        },
        {
          AND: [
            { slug: { contains: "hardstyle", mode: "insensitive" } },
            { slug: { contains: "samples", mode: "insensitive" } },
          ],
        },
      ],
    },
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
    },
  });

  const products = [...rows].sort((a, b) => scoreForOrder(a) - scoreForOrder(b));
  const top3 = products.slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-center">
        Hardstyle Samples
      </h1>

      {/* Intro-Box */}
      <div className="mt-4 mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 text-center">
        <p className="opacity-80">
          Producer Sample Collections von Blutonium – als physische Medien und
          als Download erhältlich. Wähle einfach die gewünschte Version.
        </p>
      </div>

      {/* Karten */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 place-items-center">
        {top3.map((p) => (
          <div key={p.id}>
            <ProductCard p={p as any} />
          </div>
        ))}
      </div>

      {/* Info-Box auf volle Kartenbreite */}
      <div className="mt-10 mx-auto max-w-6xl">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-6">
          <h2 className="text-xl font-bold mb-2">Hardstyle Collection</h2>
          <div className="space-y-3 opacity-90">
            <p>
              The sequel to the most popular Hardstyle sample CD worldwide! With
              this DVD sample collection you get the newest sounds to transform
              your ideas into hard techno tracks. More than 500 vocals in three
              different styles are included. A multisampled collection of new
              uniquely sounding synths and especially for reason users&apos;
              nn-19 format.
            </p>
            <p>
              This sample DVD contains a new large collection of bassdrums
              cataloged in hardstyle, hardcore, gated bassdrums, fx kick,
              jumpstyle and oldschool. Also more than 140 new drumloops sorted in
              hihats, tribal, breakbeat, claps, snares and rides for more
              usability. Of course in acidized wave and dr.rex format. A big
              collection of special effects will smooth your production with
              explosions, sweep effects and experimental stuff. This DVD includes
              special stabhit attack sounds, the essential way to phat up the
              track rhythmic. With this second strike coming directly from the
              Blutonium studios you will be able to produce up-to-date tracks in
              hardstyle, hardtrance, hardcore or jumpstyle.
            </p>
            <p>
              If you missed “Blutonium Hardstyle Samples Vol. 1”, no problem, this
              DVD includes the whole Vol. 1 sample CD.
            </p>
            <p>
              <strong>Formats:</strong> Acid – WAV – Dr.Rex – Reason 2.5 Refill
            </p>
            <hr className="border-white/10 my-3" />
            <h3 className="font-semibold">Auch als Download erhältlich</h3>
            <p className="text-sm">
              Nach dem Kauf erhältst du automatisch eine E-Mail mit deinem
              persönlichen Download-Link (ACID, NN-XT, Reason Refill, REX, WAV ·
              Download Size ca. 1.16 GB).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}