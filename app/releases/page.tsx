// app/releases/page.tsx
import { prisma } from "../../lib/db";

export const dynamic = "force-dynamic";

type Release = {
  id: string;
  type?: "ALBUM" | "SINGLE" | "EP" | "COMPILATION" | string | null;
  year?: number | null;
  title: string;
  artists?: string | null;
  label?: string | null;
  catalog?: string | null;
  cover?: string | null;               // 500x500 Bild
  spotifyUrl?: string | null;
  appleUrl?: string | null;
  beatportUrl?: string | null;
};

export default async function ReleasesPage() {
  // 👉 Passe diese select-Felder ggf. an deine Prisma-Release-Tabelle an.
  const releases = (await prisma.release.findMany({
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      type: true,
      year: true,
      title: true,
      artists: true,
      label: true,
      catalog: true,
      cover: true,
      spotifyUrl: true,
      appleUrl: true,
      beatportUrl: true,
    },
  })) as Release[];

  // Jahre für Filter-Chips
  const years = Array.from(
    new Set(releases.map((r) => (r.year ?? 0))).values()
  )
    .filter(Boolean)
    .sort((a, b) => Number(b) - Number(a));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl sm:text-5xl font-extrabold">
        Blutonium Records Veröffentlichungen
      </h1>
      <p className="opacity-70 mt-2">
        Neueste zuerst. Die aktuellsten Jahre werden vollständig vorgeladen.
      </p>

      {/* Typ-Chips (rein optisch – ohne Routing) */}
      <div className="mt-6 flex flex-wrap gap-2">
        {["Alle", "Singles & EPs", "Alben", "Compilations"].map((t) => (
          <button
            key={t}
            type="button"
            className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-sm"
            aria-pressed={t === "Alle"}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Jahr-Chips (rein optisch) */}
      <div className="mt-4 flex flex-wrap gap-2">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            className="px-3 py-1 rounded bg-white/8 hover:bg-white/15 text-sm"
          >
            {y}
          </button>
        ))}
      </div>

      {/* Liste nach Jahr gruppiert */}
      <div className="mt-8 space-y-10">
        {years.map((y) => {
          const group = releases.filter((r) => r.year === y);
          if (group.length === 0) return null;
          return (
            <section key={y}>
              <h2 className="text-xl font-bold mb-3">{y}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.map((r) => (
                  <article
                    key={r.id}
                    className="rounded-2xl bg-white/5 border border-white/10 p-3 flex gap-3"
                  >
                    <div className="shrink-0 w-[100px] h-[100px] rounded-lg overflow-hidden bg-black/30">
                      <img
                        src={r.cover || "/placeholder.png"}
                        alt={r.title}
                        width={100}
                        height={100}
                        className="w-[100px] h-[100px] object-cover"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="text-[11px] uppercase opacity-70 mb-1">
                        <span className="px-2 py-0.5 rounded bg-white/10">
                          {(r.type || "ALBUM").toString()}
                        </span>
                        {r.label ? (
                          <span className="ml-2">Label: {r.label}</span>
                        ) : null}
                        {r.catalog ? (
                          <span className="ml-2">Cat#: {r.catalog}</span>
                        ) : null}
                      </div>

                      <div className="font-semibold leading-snug">
                        {r.title}
                      </div>
                      {r.artists ? (
                        <div className="text-sm opacity-80">{r.artists}</div>
                      ) : null}

                      <div className="mt-2 flex flex-wrap gap-2">
                        {r.spotifyUrl ? (
                          <a
                            href={r.spotifyUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded bg-green-500/30 hover:bg-green-500/40 text-sm"
                          >
                            Spotify
                          </a>
                        ) : null}
                        {r.appleUrl ? (
                          <a
                            href={r.appleUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded bg-white/20 hover:bg-white/30 text-sm"
                          >
                            Apple Music
                          </a>
                        ) : null}
                        {r.beatportUrl ? (
                          <a
                            href={r.beatportUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded bg-cyan-500/30 hover:bg-cyan-500/40 text-sm"
                          >
                            Beatport
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}