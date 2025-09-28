// components/ReleaseLinks.tsx
"use client";

import type { ReactNode } from "react";

type Props = {
  spotifyUrl?: string | null;
  appleUrl?: string | null;
  beatportUrl?: string | null;
  compact?: boolean; // kleinere Buttons z. B. in Karten
};

export default function ReleaseLinks({
  spotifyUrl,
  appleUrl,
  beatportUrl,
  compact = false,
}: Props) {
  const base =
    compact
      ? "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold"
      : "inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-sm font-semibold";

  const btn = (href: string, label: string, icon: ReactNode) => (
    <a
      key={label}
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`${base} bg-white/10 hover:bg-white/20`}
      title={label}
    >
      {icon}
      <span className={compact ? "hidden sm:inline" : ""}>{label}</span>
    </a>
  );

  const items: ReactNode[] = [];

  if (spotifyUrl) {
    items.push(
      btn(
        spotifyUrl,
        "Spotify",
        // einfache Spotify-Note
        <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 1.5A10.5 10.5 0 1 0 22.5 12 10.51 10.51 0 0 0 12 1.5Zm4.58 14.77a.89.89 0 0 1-1.23.3 11.69 11.69 0 0 0-6.5-1.14 13.63 13.63 0 0 0-3.62.64.89.89 0 1 1-.56-1.68 15.51 15.51 0 0 1 4.13-.73 13.52 13.52 0 0 1 7.51 1.31.89.89 0 0 1 .27 1.3Zm1.65-3.12a1.11 1.11 0 0 1-1.53.37 14.86 14.86 0 0 0-7.69-1.35 17.71 17.71 0 0 0-4.69.83 1.11 1.11 0 1 1-.69-2.11 19.59 19.59 0 0 1 5.2-.93 16.94 16.94 0 0 1 8.72 1.54 1.11 1.11 0 0 1 .68 1.65Zm.22-3.34a1.33 1.33 0 0 1-1.84.45 17.76 17.76 0 0 0-9.19-1.58 21.78 21.78 0 0 0-5.2 1 1.33 1.33 0 1 1-.84-2.52 24 24 0 0 1 5.77-1.12 20.38 20.38 0 0 1 10.48 1.8 1.33 1.33 0 0 1 .82 1.97Z"
          />
        </svg>
      )
    );
  }

  if (appleUrl) {
    items.push(
      btn(
        appleUrl,
        "Apple Music",
        <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden="true">
          <path
            fill="currentColor"
            d="M16.36 2.01a4.77 4.77 0 0 1-1.2 3.54 4.29 4.29 0 0 1-3.25 1.58 4.83 4.83 0 0 1 1.2-3.6A4.64 4.64 0 0 1 16.36 2ZM20.7 17.1a6.41 6.41 0 0 1-1.2 2.29 5.9 5.9 0 0 1-1.18 1.19 5.1 5.1 0 0 1-1.3.74 4.48 4.48 0 0 1-1.57.31 4.65 4.65 0 0 1-1.77-.37 4.52 4.52 0 0 1-1.32-.81 4.86 4.86 0 0 1-.95-1.17 4.75 4.75 0 0 1-.49-1.28 5.38 5.38 0 0 1-.11-1.14 5.14 5.14 0 0 1 .54-2.2 4.75 4.75 0 0 1 1.18-1.57 3.6 3.6 0 0 1 1.26-.77 3.87 3.87 0 0 1 1.4-.24 4.38 4.38 0 0 1 1.8.44 3.62 3.62 0 0 0 1.42.37 3.33 3.33 0 0 0 1.33-.41 3 3 0 0 0 .51-.36l.26-.22a5.66 5.66 0 0 1-1.02 2.78Z"
          />
        </svg>
      )
    );
  }

  if (beatportUrl) {
    items.push(
      btn(
        beatportUrl,
        "Beatport",
        <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm0 17.5A7.5 7.5 0 1 1 19.5 12 7.508 7.508 0 0 1 12 19.5Zm-.75-3.5a1.75 1.75 0 1 0 0-3.5H9v-5h2.25A3.75 3.75 0 0 1 15 11.25 3.75 3.75 0 0 1 11.25 15H9v1h2.25Z"
          />
        </svg>
      )
    );
  }

  if (items.length === 0) return null;

  return <div className="flex flex-wrap gap-2">{items}</div>;
}