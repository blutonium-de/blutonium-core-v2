// app/de/artists/page.tsx
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { headers } from "next/headers";

type Artist = {
  id: string;
  name: string;
  followers?: number | null;
  genre?: string | null;
  photo?: string | null;
  spotifyUrl?: string | null;
  appleUrl?: string | null;
  beatportUrl?: string | null;
};

function getBaseUrl() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function getArtists(): Promise<Artist[]> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/spotify/artists`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const j = await res.json();
    return Array.isArray(j?.items) ? (j.items as Artist[]) : [];
  } catch {
    return [];
  }
}

export default async function ArtistsPage() {
  const artists = await getArtists();

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <h1 className="text-3xl sm:text-4xl font-extrabold">Artists &amp; Booking</h1>
      <p className="opacity-70 mt-1">
        Blutonium Records Artists. Booking-Anfragen bitte an: <span className="opacity-90">booking@blutonium.de</span>
      </p>

      {artists.length === 0 ? (
        <p className="opacity-70 mt-6">Noch keine Artists angelegt.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {artists.map((a) => (
            <article
              key={a.id}
              className="rounded-2xl bg-white/5 border border-white/10 p-4"
            >
              {/* 250×250 wie Releases */}
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
                <h2 className="text-lg font-semibold leading-snug text-center sm:text-left">{a.name}</h2>

                {/* kleine Meta-Zeile */}
                <div className="mt-1 text-xs opacity-70 text-center sm:text-left">
                  {a.genre ? a.genre : "—"}
                  {typeof a.followers === "number" && a.followers > 0 ? (
                    <span className="ml-2">{a.followers.toLocaleString()} Follower</span>
                  ) : null}
                </div>

                {/* Links wie auf Releases */}
                <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
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
                  {a.appleUrl ? (
                    <a
                      href={a.appleUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 rounded bg-white/20 hover:bg-white/30 text-sm"
                    >
                      Apple Music
                    </a>
                  ) : null}
                  {a.beatportUrl ? (
                    <a
                      href={a.beatportUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 rounded bg-cyan-500/30 hover:bg-cyan-500/40 text-sm"
                    >
                      Beatport
                    </a>
                  ) : null}
                </div>

                {/* Booking-Button randgleich */}
                <button
                  type="button"
                  className="mt-4 w-full px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
                >
                  Book now
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}