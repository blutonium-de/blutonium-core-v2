// components/ReleaseLinks.tsx
"use client";

type Props = {
  spotifyUrl?: string | null;
  appleUrl?: string | null;
  beatportUrl?: string | null;

  /** Für Fallback-Suche, wenn appleUrl/beatportUrl nicht gesetzt sind */
  artist?: string | null;
  title?: string | null;

  /** Optional vorhandenes Compact-Flag beibehalten */
  compact?: boolean;
};

export default function ReleaseLinks({
  spotifyUrl,
  appleUrl,
  beatportUrl,
  artist,
  title,
  compact,
}: Props) {
  const artistSafe = (artist || "").trim();
  const titleSafe = (title || "").trim();
  const q = encodeURIComponent([artistSafe, titleSafe].filter(Boolean).join(" ").trim());

  // Fallbacks auf Suche, falls keine Deeplinks vorhanden
  const appleHref =
    appleUrl || (q ? `https://music.apple.com/de/search?term=${q}` : undefined);
  const beatportHref =
    beatportUrl || (q ? `https://www.beatport.com/search?q=${q}` : undefined);

  const base =
    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition";

  // kompakter Modus (du nutzt bereits 'compact' – hier minimal kleiner machen, wenn gewünscht)
  const size = compact ? "px-2.5 py-1 text-[11px]" : "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Spotify */}
      {spotifyUrl && (
        <a
          href={spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${base} ${size} bg-[#1DB954]/15 text-[#1DB954] hover:bg-[#1DB954]/25`}
          aria-label="Auf Spotify öffnen"
        >
          Spotify
        </a>
      )}

      {/* Apple Music – immer zeigen (mit Suche, wenn kein Deeplink) */}
      {appleHref && (
        <a
          href={appleHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`${base} ${size} bg-[#fc3c44]/15 text-[#fc3c44] hover:bg-[#fc3c44]/25`}
          aria-label="Auf Apple Music öffnen"
        >
           Apple Music
        </a>
      )}

      {/* Beatport – immer zeigen (mit Suche, wenn kein Deeplink) */}
      {beatportHref && (
        <a
          href={beatportHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`${base} ${size} bg-[#A7E300]/15 text-[#A7E300] hover:bg-[#A7E300]/25`}
          aria-label="Auf Beatport öffnen"
        >
          Beatport
        </a>
      )}
    </div>
  );
}