// app/artists/page.tsx
import { prisma } from "../../lib/db";

export const dynamic = "force-dynamic";

type Artist = {
  id: string;
  name: string;
  photo?: string | null;      // 500x500
  bio?: string | null;
  bookingEmail?: string | null;
  instagram?: string | null;
  spotify?: string | null;
  soundcloud?: string | null;
};

export default async function ArtistsPage() {
  // 👉 Passe select an deine Artist-Tabelle an.
  const artists = (await prisma.artist.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      photo: true,
      bio: true,
      bookingEmail: true,
      instagram: true,
      spotify: true,
      soundcloud: true,
    },
  })) as Artist[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl sm:text-5xl font-extrabold">Artists &amp; Booking</h1>
      <p className="opacity-70 mt-2">
        Offizielle Blutonium Records Artists. Hör rein, folge ihnen und stelle
        deine Booking-Anfrage.
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {artists.map((a) => (
          <article
            key={a.id}
            className="rounded-2xl bg-white/5 border border-white/10 p-3"
          >
            <div className="w-full h-[250px] rounded-xl overflow-hidden bg-black/30">
              <img
                src={a.photo || "/placeholder.png"}
                alt={a.name}
                width={500}
                height={500}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="mt-3">
              <div className="text-lg font-semibold">{a.name}</div>
              {a.bio ? (
                <div className="text-sm opacity-80 line-clamp-3 mt-1">{a.bio}</div>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {a.spotify ? (
                <a
                  href={a.spotify}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 rounded bg-green-500/30 hover:bg-green-500/40 text-sm"
                >
                  Spotify
                </a>
              ) : null}
              {a.soundcloud ? (
                <a
                  href={a.soundcloud}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 rounded bg-orange-500/30 hover:bg-orange-500/40 text-sm"
                >
                  SoundCloud
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
              {a.bookingEmail ? (
                <a
                  href={`mailto:${a.bookingEmail}`}
                  className="px-2 py-1 rounded bg-white/20 hover:bg-white/30 text-sm"
                >
                  Booking
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}