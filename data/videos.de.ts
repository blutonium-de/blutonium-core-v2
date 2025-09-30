// data/videos.de.ts
export type SimpleVideo = {
  id: string;            // YouTube Video ID (z.B. "dQw4w9WgXcQ")
  title: string;
  publishedAt?: string;  // ISO-Datum optional
};

export const videosDE: SimpleVideo[] = [
  // ⬇️ Hier deine Videos aus der ZIP-Liste eintragen (nur IDs & Titel)
  { id: "XXXXXXXXXXX1", title: "Blutonium Records – Sample Video 1", publishedAt: "2024-09-21" },
  { id: "XXXXXXXXXXX2", title: "Blutonium Boy – Your Flame (Official)", publishedAt: "2024-08-10" },
  { id: "XXXXXXXXXXX3", title: "Hardstyle Classics – Live Set", publishedAt: "2024-07-01" },
  // … beliebig erweitern
];

// Hilfsfunktion fürs Thumbnail
export const ytThumb = (id: string, quality: "hqdefault" | "mqdefault" | "sddefault" = "hqdefault") =>
  `https://i.ytimg.com/vi/${id}/${quality}.jpg`;