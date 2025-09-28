"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"

export default function LangSwitch() {
  const pathname = usePathname() || ""

  // ganz einfache Logik: wenn der Pfad mit /de/ anfängt → englisch anbieten
  // sonst → deutsch anbieten
  const isGerman = pathname.startsWith("/de")

  const target = isGerman
    ? pathname.replace(/^\/de/, "/en") || "/en"
    : "/de" + (pathname === "/" ? "" : pathname)

  const label = isGerman ? "EN" : "DE"

  return (
    <Link
      href={target}
      className="px-2 py-1 text-sm rounded bg-white/10 hover:bg-white/20"
    >
      {label}
    </Link>
  )
}