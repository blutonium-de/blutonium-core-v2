// app/layout.tsx
import "./globals.css"
import type { Metadata, Viewport } from "next"
import NavBar from "../components/NavBar"
import CartButton from "../components/CartButton"
import FloatingCheckoutBar from "../components/FloatingCheckoutBar"

export const metadata: Metadata = {
  title: "Blutonium Records",
  description: "Since 1995 — Hardstyle / Hardtrance / Hard Dance",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      {/* body mit fixer NavBar (64px/4rem) → main bekommt top-padding */}
      <body className="min-h-screen bg-black text-white antialiased">
        {/* NavBar mit Warenkorb-Button */}
        <NavBar>
          <CartButton href="/de/cart" />
        </NavBar>

        <main className="min-h-[calc(100vh-4rem)] pt-16">
          {children}
        </main>

        <footer className="border-t border-white/10 py-10 mt-16 text-sm opacity-80">
          <div className="max-w-6xl mx-auto px-4 text-center">
            © {new Date().getFullYear()} Blutonium Records — Since 1995
          </div>
        </footer>

        {/* Sticky Checkout-Bar (unten) */}
        <FloatingCheckoutBar href="/de/cart" />
      </body>
    </html>
  )
}