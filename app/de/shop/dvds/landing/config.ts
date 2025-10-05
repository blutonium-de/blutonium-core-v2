// app/de/shop/dvds/landing/config.ts

export type LandingRoute = {
  slug: string;
  title: string;
  description: string;
  h1?: string;
  keywords?: string[];
};

export const landingRoutes: LandingRoute[] = [
  {
    slug: "action",
    title: "Action DVDs gebraucht kaufen | Blutonium Records",
    description:
      "Gebrauchte Action-DVDs günstig kaufen: Klassiker, Blockbuster & Raritäten – geprüft und mit schneller Lieferung.",
    h1: "Gebrauchte Action-DVDs",
    keywords: ["Action DVDs", "gebrauchte DVDs", "Film Klassiker", "Blu-ray Alternativen"],
  },
  {
    slug: "horror",
    title: "Horror DVDs gebraucht kaufen | Blutonium Records",
    description:
      "Horror, Thriller & Kult-Schocker als gebrauchte DVDs – von Klassikern bis versteckten Perlen.",
    h1: "Horror & Thriller – gebraucht",
    keywords: ["Horror DVDs", "Thriller", "Kultfilme", "FSK 18"],
  },
  {
    slug: "komoedie",
    title: "Komödien auf DVD gebraucht | Blutonium Records",
    description:
      "Lachen garantiert: gebrauchte Komödien-DVDs, RomComs & Familienfilme – günstig & geprüft.",
    h1: "Komödien auf DVD – gebraucht",
    keywords: ["Komödie", "RomCom", "Familienfilm", "DVD gebraucht"],
  },
  {
    slug: "scifi",
    title: "Science-Fiction DVDs gebraucht | Blutonium Records",
    description:
      "Sci-Fi-Klassiker, Space-Operas & Cyberpunk als gebrauchte DVDs. Finde seltene Ausgaben und Kult-Filme.",
    h1: "Science-Fiction auf DVD",
    keywords: ["Science Fiction", "Sci-Fi", "Cyberpunk", "Space Opera"],
  },
  {
    slug: "western",
    title: "Western DVDs gebraucht | Blutonium Records",
    description:
      "Italo-Western, Klassiker & moderne Western als gebrauchte DVDs – Sammlerfunde inklusive.",
    h1: "Western – gebraucht kaufen",
    keywords: ["Western", "Italo-Western", "Klassiker", "DVD Shop"],
  },
];

// optional, falls du woanders einen Default brauchst
export default landingRoutes;