// components/ReleaseLinks.tsx
"use client";

type Props = {
  title?: string | null;
  artists?: string | null;
  spotifyUrl?: string | null;
  appleUrl?: string | null;
  beatportUrl?: string | null;
  size?: "sm" | "md";
};

function buildAppleSearch(artists?: string | null, title?: string | null) {
  const q = [artists || "", title || ""].join(" ").trim();
  return `https://music.apple.com/de/search?term=${encodeURIComponent(q)}`;
}
function buildBeatportSearch(artists?: string | null, title?: string | null) {
  const q = [artists || "", title || ""].join(" ").trim();
  return `https://www.beatport.com/search?q=${encodeURIComponent(q)}`;
}

export default function ReleaseLinks({
  title,
  artists,
  spotifyUrl,
  appleUrl,
  beatportUrl,
  size = "sm",
}: Props) {
  const cls =
    size === "md"
      ? "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-semibold"
      : "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold";

  const btn = (href: string, label: string, icon: JSX.Element) => (
    <a
      key={label}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${cls} bg-white/10 hover:bg-white/20`}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </a>
  );

  const appleHref = appleUrl || buildAppleSearch(artists, title);
  const beatHref = beatportUrl || buildBeatportSearch(artists, title);

  return (
    <div className="flex flex-wrap gap-2">
      {spotifyUrl &&
        btn(
          spotifyUrl,
          "Spotify",
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
            <path
              fill="currentColor"
              d="M12 1.5A10.5 10.5 0 1 0 22.5 12 10.512 10.512 0 0 0 12 1.5Zm4.79 15.2a.75.75 0 0 1-1.03.24 12.94 12.94 0 0 0-7.52-1.16.75.75 0 1 1-.25-1.48 14.45 14.45 0 0 1 8.4 1.3.75.75 0 0 1 .4 1.1Zm1.4-3.08a.94.94 0 0 1-1.29.3 15.92 15.92 0 0 0-9.28-1.6.93.93 0 1 1-.29-1.84 17.78 17.78 0 0 1 10.35 1.8.94.94 0 0 1 .51 1.34Zm.12-3.22a1.13 1.13 0 0 1-1.56.36 18.76 18.76 0 0 0-10.9-1.89 1.13 1.13 0 1 1-.35-2.23 21 21 0 0 1 12.2 2.12 1.13 1.13 0 0 1 .61 1.64Z"
            />
          </svg>
        )}
      {btn(
        appleHref,
        "Apple",
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
          <path
            fill="currentColor"
            d="M16.36 1.64a4.1 4.1 0 0 1-1.2 3.12 3.5 3.5 0 0 1-2.62 1.18 3.9 3.9 0 0 1 1.16-3 3.7 3.7 0 0 1 2.66-1.3ZM20.5 17.7c-.42.98-.92 1.79-1.5 2.42-.79.86-1.68 1.3-2.66 1.3-.65 0-1.44-.19-2.36-.57-.92-.38-1.77-.57-2.54-.57-.8 0-1.66.19-2.58.57-.92.38-1.68.57-2.28.57-1.04 0-1.98-.47-2.8-1.42-.6-.67-1.13-1.52-1.6-2.56C1.63 15.8 1.34 14.27 1.34 13c0-1.39.3-2.68.89-3.86a6.8 6.8 0 0 1 2.44-2.86A6 6 0 0 1 7.9 5.3c.63 0 1.47.2 2.52.6 1.05.4 1.77.6 2.16.6.29 0 1-.24 2.13-.73 1.14-.49 2.1-.69 2.9-.6a6 6 0 0 1 4.11 2.13 6.3 6.3 0 0 0-3.1 5.34c0 1.26.34 2.35 1.02 3.28Z"
          />
        </svg>
      )}
      {btn(
        beatHref,
        "Beatport",
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
          <path
            fill="currentColor"
            d="M3 12a9 9 0 1 1 9 9H9v-3h3a6 6 0 1 0-6-6H3Z"
          />
        </svg>
      )}
    </div>
  );
}