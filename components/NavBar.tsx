// components/NavBar.tsx
"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState, useEffect, useMemo } from "react"

// optionales Sprachpräfix (z.B. /de/…) abwerfen & vereinheitlichen
function normalize(path: string) {
  const parts = (path || "/").split("/").filter(Boolean)
  if (parts[0] && parts[0].length === 2) parts.shift() // 'de', 'en', …
  return "/" + parts.join("/")
}

type NavLink = { href: string; label: string }

export default function NavBar() {
  const pathname = usePathname() || "/"
  const norm = useMemo(() => normalize(pathname), [pathname])

  const [open, setOpen] = useState(false)
  useEffect(() => { setOpen(false) }, [pathname])

  // 👉 Links zentral hier pflegen
  const links: NavLink[] = [
    { href: "/releases",     label: "Releases" },
    { href: "/artists",      label: "Artists & Booking" },
    { href: "/merchandise",  label: "Merchandise" },
    { href: "/samples",      label: "Samples" },
    { href: "/videos",       label: "Videos" },
  ]

  // aktive Erkennung: exakter Match ODER Unterseiten
  const isActive = (href: string) => {
    const a = normalize(href)
    return norm === a || norm.startsWith(a + "/")
  }

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-black/70 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label="Startseite">
          <Image src="/logo.png" alt="Blutonium" width={32} height={32} className="rounded" priority />
          <span className="hidden sm:inline text-sm font-bold tracking-wide">Blutonium Records</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {links.map(l => {
            const active = isActive(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "text-sm transition",
                  active ? "text-cyan-400 font-semibold" : "text-white/80 hover:text-cyan-300"
                ].join(" ")}
              >
                {l.label}
              </Link>
            )
          })}
        </div>

        {/* Burger */}
        <button
          onClick={() => setOpen(true)}
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded bg-white/10 hover:bg-white/20"
          aria-label="Menü öffnen"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>

      {/* Mobile Overlay */}
      <div
        className={`md:hidden fixed inset-0 bg-black/50 transition-opacity ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setOpen(false)}
      />
      <div
        className={`md:hidden fixed top-0 right-0 h-full w-72 max-w-[85%] bg-black/90 border-l border-white/10 backdrop-blur-md transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
          <span className="font-semibold">Menü</span>
          <button
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center w-10 h-10 rounded bg-white/10 hover:bg-white/20"
            aria-label="Menü schließen"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-3 flex flex-col gap-2">
          {links.map(l => {
            const active = isActive(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "block rounded px-3 py-2 text-base hover:bg-white/10",
                  active ? "text-cyan-400 font-semibold" : "text-white/90"
                ].join(" ")}
              >
                {l.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}