"use client"
import { useEffect, useState } from "react"

export default function ArtistsPage() {
  const [artists, setArtists] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)

  useEffect(() => {
    fetch("/api/artists")
      .then((res) => res.json())
      .then((data) => setArtists(data.artists))
  }, [])

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12">
      <h1 className="text-3xl font-bold text-center mb-10">Blutonium Records Artists & Booking</h1>

      {/* Artist Grid */}
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {artists.map((a) => (
          <div key={a.id} className="card p-4 flex flex-col items-center text-center">
            {a.image && <img src={a.image} alt={a.name} className="w-32 h-32 object-cover rounded-full mb-4" />}
            <h3 className="font-semibold">{a.name}</h3>
            <div className="flex gap-3 mt-2 text-sm opacity-80">
              <a href={a.spotifyUrl} target="_blank" rel="noreferrer" className="link">Spotify</a>
              <a href={a.appleUrl} target="_blank" rel="noreferrer" className="link">Apple</a>
              <a href={a.beatportUrl} target="_blank" rel="noreferrer" className="link">Beatport</a>
            </div>
            <button
              onClick={() => setSelected(a)}
              className="mt-4 px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
            >
              Book Now
            </button>
          </div>
        ))}
      </div>

      {/* Booking Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 p-6 rounded-xl w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Booking Request: {selected.name}</h2>
            <form method="POST" action="/api/booking" className="flex flex-col gap-3">
              <input type="hidden" name="artist" value={selected.name} />
              <input type="text" name="firstName" placeholder="First Name" className="input" required />
              <input type="text" name="lastName" placeholder="Last Name" className="input" required />
              <input type="email" name="email" placeholder="Email" className="input" required />
              <input type="text" name="company" placeholder="Company" className="input" />
              <input type="text" name="event" placeholder="Event Name" className="input" required />
              <input type="text" name="location" placeholder="Event Location" className="input" required />
              <input type="date" name="date" className="input" required />
              <input type="number" name="capacity" placeholder="Capacity (expected guests)" className="input" />
              <textarea name="message" placeholder="Your message..." className="input h-24" required />
              <div className="flex gap-3 mt-3">
                <button type="submit" className="px-4 py-2 bg-cyan-500 text-black rounded">Send</button>
                <button type="button" onClick={() => setSelected(null)} className="px-4 py-2 bg-zinc-700 rounded">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
