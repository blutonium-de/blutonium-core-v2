"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type VideoItem = {
  id: string;
  title: string;
  thumb: string;
  publishedAt: string;
  url: string;
};

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const r = await fetch("/api/youtube?max=12", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || `YouTube API ${r.status}`);

        const list: VideoItem[] = Array.isArray(j?.videos)
          ? j.videos
              .map((v: any) => ({
                id: String(v?.id ?? ""),
                title: String(v?.title ?? ""),
                thumb: String(v?.thumb ?? ""),
                publishedAt: String(v?.publishedAt ?? ""),
                url: String(v?.url ?? ""),
              }))
              .filter((v) => v.id && v.thumb && v.url)
          : [];

        if (alive) setVideos(list);
      } catch (e: any) {
        if (alive) setError(e?.message || "Konnte Videos nicht laden");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <Header />
        <p className="mt-4 text-white/70">Lade YouTube-Videos …</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <Header />
        <p className="mt-4 text-red-300">Fehler: {error}</p>
      </div>
    );
  }

  if (!videos.length) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <Header />
        <p className="mt-4 text-white/70">Keine Videos gefunden.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <Header />

      {/* Hier kann deine Suche/Sortierung stehen, falls sie in dieser Datei ist. */}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <a
            key={v.id}
            href={v.url}
            target="_blank"
            rel="noreferrer"
            className="group rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition"
          >
            <div className="aspect-video overflow-hidden bg-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={v.thumb}
                alt={v.title}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                loading="lazy"
              />
            </div>

            <div className="p-4">
              <h3 className="font-semibold line-clamp-2">{v.title}</h3>
              <p className="mt-2 text-sm text-white/60">
                {new Date(v.publishedAt).toLocaleDateString("de-AT", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                })}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

/** Header wie im Shop, mit Logos + Headline + Subline + Text */
function Header() {
  return (
    <header className="mb-8 text-center">
      <div className="flex items-center justify-center gap-4 sm:gap-6">
        <Image
          src="/logos/blutonium-records.png"
          alt="Blutonium Records"
          width={150}
          height={150}
          className="invert w-[100px] sm:w-[130px] md:w-[150px] h-auto"
          priority
        />
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Blutonium Records YouTube
        </h1>
        <Image
          src="/logos/blutonium-media.png"
          alt="Blutonium Media"
          width={150}
          height={150}
          className="invert w-[100px] sm:w-[130px] md:w-[150px] h-auto"
          priority
        />
      </div>

      <h2 className="mt-4 text-xl md:text-2xl font-bold">
        Herzlich Willkommen auf unserem YouTube Kanal
      </h2>
      <p className="mt-3 text-[13px] md:text-[15px] text-white/80 max-w-3xl mx-auto">
        Hier findest du den ein oder andern Release als Music Video, oder sogar auch den
        ein oder andern Live Auftritt von einem unserer Künstler! Auch die Playlists
        sind interessant, denn da findest du coole DJ MIx Sessions! Viel Spass!
      </p>
    </header>
  );
}