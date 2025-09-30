// app/en/artists/page.tsx
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
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl sm:text-5xl font-extrabold">Artists & Booking</h1>
      <p className="opacity-70 mt-2">
        Official Blutonium Records artists. Listen, follow and send your booking request.
      </p>

      {artists.length === 0 ? (
        <p className="opacity-70 mt-6">No artists yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {artists.map((a) => (
            <article
              key={a.id}
              className="rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-col items-center"
            >
              <div className="w-28 h-28 rounded-full overflow-hidden bg-black/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.photo || "/placeholder.png"}
                  alt={a.name}
                  width={112}
                  height={112}
                  className="w-28 h-28 object-cover"
                />
              </div>
              <div className="mt-3 text-lg font-semibold">{a.name}</div>
              <div className="text-sm opacity-80">
                {a.followers ? `${a.followers.toLocaleString()} followers` : "—"}
              </div>
              {a.genre && <div className="text-xs opacity-70">{a.genre}</div>}

              <div className="mt-3 flex gap-2">
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

              <button
                type="button"
                className="mt-4 w-full px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
              >
                Book now
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}