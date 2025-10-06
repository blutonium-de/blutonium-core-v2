// app/de/shop/dvds/landing/page.tsx
import { Metadata } from "next";
import dvdLandingPresets from "./config";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "DVD & Blu-ray Landing Pages",
  description: "SEO-Landing-Seiten für den Gebraucht-DVD- & Blu-ray-Bereich.",
  robots: { index: false, follow: false }, // Seite selbst nicht listen
};

export default function DvdLandingIndexPage() {
  // reine Index-/Platzhalterseite, damit der Ordner existiert
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">DVD Landing (intern)</h1>
      <p className="opacity-70 mt-2">
        Diese Seite ist nur ein Platzhalter. Die eigentlichen SEO-Seiten liegen unter
        <code> /de/shop/dvds/landing/[slug]</code>.
      </p>
      <ul className="list-disc ml-5 mt-4 opacity-70 text-sm">
        {dvdLandingPresets.map((r) => (
          <li key={r.slug}>/de/shop/dvds/landing/{r.slug}</li>
        ))}
      </ul>
    </main>
  );
}