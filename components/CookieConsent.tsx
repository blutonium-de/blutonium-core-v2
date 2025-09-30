// components/CookieConsent.tsx
"use client"
import { useEffect, useState } from "react"

export default function CookieConsent() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  // ... dein bisheriges Banner UI
}