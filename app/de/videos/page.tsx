import type { Metadata } from "next";
import Image from "next/image";
import VideosClient from "../../../components/VideosClient";

export const metadata: Metadata = {
  title: "Videos – Blutonium Records",
  description: "Neueste Uploads vom offiziellen Blutonium Records YouTube-Kanal.",
  openGraph: {
    title: "Videos – Blutonium Records",
    description: "Neueste Uploads vom offiziellen Blutonium Records YouTube-Kanal.",
    url: "https://www.blutonium.de/de/videos",
    siteName: "Blutonium Records",
    type: "website",
  },
  alternates: { canonical: "/de/videos" },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header wie im Shop */}
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

      {/* deine bestehende Videos-UI (Suche/Sortierung) */}
      <VideosClient />
    </div>
  );
}