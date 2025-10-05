// app/dvds/landing/config.ts
export type DvdLandingPreset = {
  slug: string;
  title: string;
  description?: string;
  where: any; // Prisma-Where (leichtgewichtig gehalten)
};

export const dvdLandingPresets: DvdLandingPreset[] = [
  {
    slug: "horror-dvd-gebraucht",
    title: "Gebrauchte Horror-DVDs",
    description:
      "Entdecke gebrauchte Horror-DVDs: Klassiker, Kult- und Indie-Titel – geprüft & schnell versendet.",
    where: {
      categoryCode: { in: ["dvd", "bray"] },
      genre: "Horror",
      active: true,
      stock: { gt: 0 },
    },
  },
  {
    slug: "action-dvd-gebraucht",
    title: "Gebrauchte Action-DVDs",
    description:
      "Action auf DVD & Blu-ray gebraucht kaufen – von Klassikern bis Neuzeit-Blockbustern.",
    where: {
      categoryCode: { in: ["dvd", "bray"] },
      genre: "Action",
      active: true,
      stock: { gt: 0 },
    },
  },
  {
    slug: "fsk-18-dvd",
    title: "FSK 18 – DVDs & Blu-rays gebraucht",
    description:
      "FSK 18 Filme gebraucht: geprüfte Qualität, sichere Verpackung, schneller Versand.",
    where: {
      categoryCode: { in: ["dvd", "bray"] },
      fsk: "FSK 18",
      active: true,
      stock: { gt: 0 },
    },
  },
  {
    slug: "fsk-16-dvd",
    title: "FSK 16 – DVDs & Blu-rays gebraucht",
    description: "Gebrauchte FSK 16 Filme – geprüft, günstig & schnell geliefert.",
    where: {
      categoryCode: { in: ["dvd", "bray"] },
      fsk: "FSK 16",
      active: true,
      stock: { gt: 0 },
    },
  },
  {
    slug: "blu-ray-gebraucht",
    title: "Gebrauchte Blu-rays",
    description: "Blu-rays gebraucht kaufen: Top-Zustand, fairer Preis, schnelle Lieferung.",
    where: {
      categoryCode: "bray",
      active: true,
      stock: { gt: 0 },
    },
  },
  {
    slug: "dvd-gebraucht",
    title: "Gebrauchte DVDs",
    description: "Große Auswahl gebrauchter DVDs – getestet & sicher verpackt.",
    where: {
      categoryCode: "dvd",
      active: true,
      stock: { gt: 0 },
    },
  },
];