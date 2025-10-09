"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"

export default function NavBar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close on route change
  useEffect(() => { setOpen(false) }, [pathname])

  const links = [
    { href: "/de/releases", label: "Releases" },   // ⬅️ angepasst
    { href: "/merchandise", label: "Merchandise" },
    { href: "/samples", label: "Samples" },
    { href: "/videos", label: "Videos" },
  ]

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-black/70 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Blutonium Records Logo" width={36} height={36} priority className="rounded" />
          <span className="hidden sm:inline text-sm font-bold tracking-wide text-white">
            Blutonium Records
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm sm:text-base hover:text-cyan-300 transition ${
                pathname === link.href ? "text-cyan-400 font-semibold" : "text-white/80"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button className="ml-2 text-sm px-2 py-1 rounded bg-white/10 hover:bg-white/20">DE/EN</button>
        </div>

        {/* Mobile burger */}
        <button
          onClick={() => setOpen(true)}
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded bg-white/10 hover:bg-white/20"
          aria-label="Open menu"
        >
          {/* icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer + backdrop */}
      {/* Backdrop */}
      <div
        className={`md:hidden fixed inset-0 bg-black/50 transition-opacity ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setOpen(false)}
      />
      {/* Drawer */}
      <div
        className={`md:hidden fixed top-0 right-0 h-full w-72 max-w-[85%] bg-black/90 border-l border-white/10 backdrop-blur-md transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
          <span className="text-white font-semibold">Menü</span>
          <button
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center w-10 h-10 rounded bg-white/10 hover:bg-white/20"
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-3 flex flex-col gap-2">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded px-3 py-2 text-base hover:bg-white/10 ${
                pathname === link.href ? "text-cyan-400 font-semibold" : "text-white/90"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 border-t border-white/10 pt-3">
            <button className="w-full text-left rounded px-3 py-2 bg-white/10 hover:bg-white/20">DE/EN</button>
          </div>
        </div>
      </div>
    </nav>
  )
}