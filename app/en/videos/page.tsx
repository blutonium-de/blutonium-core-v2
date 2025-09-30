// app/en/videos/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import VideosClient from "../../../components/VideosClient";

export const metadata: Metadata = {
  title: "Videos – Blutonium Records",
  description: "Latest uploads from the official Blutonium Records YouTube channel.",
  openGraph: {
    title: "Videos – Blutonium Records",
    description: "Latest uploads from the official Blutonium Records YouTube channel.",
    url: "https://www.blutonium.de/en/videos",
    siteName: "Blutonium Records",
    type: "website",
  },
  alternates: { canonical: "/en/videos" },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
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
          Welcome to our YouTube channel
        </h2>
        <p className="mt-3 text-[13px] md:text-[15px] text-white/80 max-w-3xl mx-auto">
          Explore music videos, live performances and curated DJ mix playlists. Enjoy!
        </p>
      </header>

      <VideosClient />
    </div>
  );
}