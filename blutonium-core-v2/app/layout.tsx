// app/layout.tsx
import "./globals.css"
import type { Metadata, Viewport } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Blutonium Records",
  description: "Since 1995 — Hardstyle / Hardtrance",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-black text-white antialiased">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur bg-black/50 border-b border-white/10">
          <nav className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-6">
           <Link href="/de" className="font-bold tracking-widest text-blutonium-500">
  BLUTONIUM (REMOTE)
</Link>


            <div className="flex-1" />
            <Link href="/de/releases" className="hover:text-cyan-300">Releases</Link>
            <Link href="/de/merch" className="hover:text-cyan-300">Merchandise</Link>
            <Link href="/de/samples" className="hover:text-cyan-300">Samples</Link>
            <Link href="/de/videos" className="hover:text-cyan-300">Videos</Link>
          </nav>
        </header>

        {/* Main: KEIN max-w-Container, damit Hero vollflächig “breakouten” kann */}
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 py-10 mt-16 text-sm opacity-80">
          <div className="max-w-6xl mx-auto px-4">
            © {new Date().getFullYear()} Blutonium Records — Since 1995
          </div>
        </footer>
      </body>
    </html>
  )
}
