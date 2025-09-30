// app/layout.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import "./globals.css";
import type { Metadata, Viewport } from "next";
import NavBar from "../components/NavBar";
import CartButton from "../components/CartButton";
import FloatingCheckoutBar from "../components/FloatingCheckoutBar";
import SiteFooter from "../components/SiteFooter";
import AnalyticsBeacon from "@/components/AnalyticsBeacon";

// ⬇️ CookieConsent client-only:
import dynamicImport from "next/dynamic";
const CookieConsent = dynamicImport(() => import("../components/CookieConsent"), { ssr: false });

export const metadata: Metadata = {
  title: "Blutonium Records",
  description: "Since 1995 — Hardstyle / Hardtrance / Hard Dance",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-black text-white antialiased">
        <NavBar>
          <CartButton href="/de/cart" />
        </NavBar>

        <main className="min-h-[calc(100vh-4rem)] pt-16" suppressHydrationWarning>
          {children}
        </main>

        <SiteFooter />
        <FloatingCheckoutBar href="/de/cart" />

        <CookieConsent />
        <AnalyticsBeacon />
      </body>
    </html>
  );
}