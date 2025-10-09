// app/de/videos/page.tsx
import type { Metadata } from "next";
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
    <div className="mx-auto max-w-4xl px-4 py-14">
      <h1 className="text-3xl sm:text-4xl font-extrabold">Video Clips on YouTube</h1>
      <p className="opacity-70 mt-1">
        Klicke auf, oder suche das Video deiner Wahl – vergiss nicht den Kanal zu abonnieren!
      </p>

      <div className="mt-8">
        <VideosClient />
      </div>
    </div>
  );
}