// app/artists/page.tsx
import { prisma } from "../../lib/db";

export const dynamic = "force-dynamic";

type Artist = {
  id: string;
  name: string;
  bio?: string | null;
  photo?: string | null;        // 500x500
  spotifyUrl?: string | null;
  instagram?: string | null;
  website?: string | null;
};

export default async function ArtistsPage() {
  const artists = (await prisma.artist.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      bio: true,
      photo: true,
      spotifyUrl: true,
      instagram: true,
      website: true,
    },
  })) as Artist[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl sm:text-5xl font-extrabold">Artists</h1>
      <p className="opacity-70 mt-2">
        Unsere Künstler im Überblick.
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {artists.map((a) => (
          <article
            key={a.id}
            className="rounded-2xl bg-white/5 border border-white/10 p-4"
          >
            {/* Quadrat 250x250 */}
            <div className="w-full aspect-square max-w-[250px] rounded-xl overflow-hidden bg-black/30 mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.photo || "/placeholder.png"}
                alt={a.name}
                width={250}
                height={250}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            <div className="mt-4">
              <h2 className="text-lg font-semibold leading-snug">{a.name}</h2>
              {a.bio ? (
                <p className="mt-2 text-sm opacity-80 line-clamp-3">{a.bio}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {a.spotifyUrl ? (
                  <a
                    href={a.spotifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-1 rounded bg-green-500/30 hover:bg-green-500/40 text-sm"
                  >
                    Spotify
                  </a>
                ) : null}
                {a.instagram ? (
                  <a
                    href={a.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-1 rounded bg-pink-500/30 hover:bg-pink-500/40 text-sm"
                  >
                    Instagram
                  </a>
                ) : null}
                {a.website ? (
                  <a
                    href={a.website}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-1 rounded bg-white/20 hover:bg-white/30 text-sm"
                  >
                    Website
                  </a>
                ) : null}
              </div>
            </div>
          </article>
        ))}
        {artists.length === 0 && (
          <p className="opacity-70">Noch keine Artists angelegt.</p>
        )}
      </div>
    </div>
  );
}