// app/de/admin/page.tsx
"use client"

import { useState } from "react"

export default function AdminPage() {
  // Kleines Gate: Token-Eingabe im Client (schnell & simpel).
  // Für "richtig" sicher später auf Server-Check/Cookies umbauen.
  const [token, setToken] = useState("")
  const [granted, setGranted] = useState(false)

  const handleLogin = () => {
    if (!process.env.NEXT_PUBLIC_ADMIN_TOKEN) {
      alert("NEXT_PUBLIC_ADMIN_TOKEN ist nicht gesetzt.")
      return
    }
    if (token.trim() === process.env.NEXT_PUBLIC_ADMIN_TOKEN) {
      setGranted(true)
    } else {
      alert("Ungültiger Admin-Token!")
    }
  }

  if (!granted) {
    return (
      <div className="max-w-md mx-auto py-20 px-4">
        <h1 className="text-2xl font-bold mb-4">Admin Login</h1>
        <p className="text-white/70 mb-4">
          Bitte Admin-Token eingeben, um den internen Bereich zu öffnen.
        </p>
        <input
          type="password"
          className="w-full border border-white/20 rounded p-2 bg-black text-white"
          placeholder="Admin Token eingeben"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <button
          onClick={handleLogin}
          className="mt-4 px-4 py-2 bg-cyan-600 rounded text-white hover:bg-cyan-500"
        >
          Login
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-extrabold tracking-tight">Admin Dashboard</h1>
      <p className="mt-2 text-white/70">
        Willkommen im internen Bereich. Hier bauen wir das Upload- & Produkt-Tool aus.
      </p>

      <div className="mt-8 space-y-6">
        <section className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h2 className="text-xl font-semibold mb-2">Kategorien & Kürzel</h2>
          <ul className="grid sm:grid-cols-2 gap-2 text-white/90">
            <li>Blutonium Vinyls — <code className="text-cyan-300">bv</code></li>
            <li>Sonstige Vinyls — <code className="text-cyan-300">sv</code></li>
            <li>Blutonium CDs — <code className="text-cyan-300">bcd</code></li>
            <li>Sonstige CDs — <code className="text-cyan-300">scd</code></li>
            <li>Blutonium Hardstyle Samples — <code className="text-cyan-300">bhs</code></li>
            <li>Sonstiges & Specials — <code className="text-cyan-300">ss</code></li>
          </ul>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h2 className="text-xl font-semibold mb-2">Als Nächstes</h2>
          <ul className="list-disc pl-6 space-y-1 text-white/80">
            <li>Drag & Drop Cover-Upload (Auto-Erkennung Artist/Titel, editierbar)</li>
            <li>Felder: Katalognummer, Preis, Gewicht, Kategorie-Kürzel</li>
            <li>Später: Server-seitige Auth & persistente DB</li>
          </ul>
        </section>
      </div>
    </div>
  )
}