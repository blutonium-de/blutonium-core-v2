// app/en/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blutonium Records – Shop & Releases",
  description:
    "Since 1995 — Hardstyle / Hardtrance / Hard Dance. Discover rare vinyl & CD gems, compilations, and merch in the Blutonium Records shop.",
  // Optional: Sprachen-Verweise für SEO
  alternates: {
    languages: {
      "de": "/de",
      "en": "/en",
    },
  },
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  // WICHTIG: Hier KEIN <html>/<body> rendern – das macht dein Root-Layout!
  return <>{children}</>;
}