// components/SiteLayout.tsx
import "./../app/globals.css";
import type { ReactNode } from "react";
import NavBar from "@/components/NavBar";
import CartButton from "@/components/CartButton";
import FloatingCheckoutBar from "@/components/FloatingCheckoutBar";
import SiteFooter from "@/components/SiteFooter";
import CookieConsent from "@/components/CookieConsent";
import AnalyticsBeacon from "@/components/AnalyticsBeacon";

export default function SiteLayout({
  lang,
  children,
}: {
  lang: "de" | "en";
  children: ReactNode;
}) {
  return (
    <html lang={lang}>
      <body className="min-h-screen bg-black text-white antialiased">
        <NavBar>
          <CartButton href={lang === "de" ? "/de/cart" : "/en/cart"} />
        </NavBar>

        <main className="min-h-[calc(100vh-4rem)] pt-16">{children}</main>

        <SiteFooter />
        <FloatingCheckoutBar href={lang === "de" ? "/de/cart" : "/en/cart"} />
        <CookieConsent />
        <AnalyticsBeacon />
      </body>
    </html>
  );
}