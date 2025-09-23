// app/layout.tsx
import "./globals.css"
import type { Metadata, Viewport } from "next"
import NavBar from "@/components/NavBar"

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
      <body className="min-h-screen bg-black text-white antialiased">
        {/* Globale, fixierte Navigation */}
        <NavBar />
        {/* Spacer, damit der Fix-Header nichts überlappt (NavBar-Höhe = 64px) */}
        <div className="h-16" />

        {/* Content */}
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 py-10 mt-16 text-sm opacity-80">
          <div className="max-w-6xl mx-auto px-4 text-center">
            © {new Date().getFullYear()} Blutonium Records — Since 1995
          </div>
        </footer>
      </body>
    </html>
  )
}