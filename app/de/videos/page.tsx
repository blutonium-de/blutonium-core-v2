import type { Metadata } from "next"
import VideosClient from "../../../components/VideosClient"

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
}

export default function Page() {
  return <VideosClient />
}