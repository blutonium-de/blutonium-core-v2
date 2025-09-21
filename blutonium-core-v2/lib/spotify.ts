// lib/spotify.ts
// Server-seitiger Spotify Helper: holt ein App-Token (Client Credentials) und cached es kurz.
// WICHTIG: Diese Datei wird NUR serverseitig genutzt – niemals in Client Components importieren!

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'

// 👉 Hier trägst du alle relevanten Artist- oder Label-IDs ein (erste drin: Blutonium Boy)
export const ARTISTS = [
  '2qNYTspRpXKdl4MJ6TGC5T', // Blutonium Boy
  '5vbmx7Q2CFSipF64kCGC3N', // Blutonium Boys
  '19QmW7ALL7ZhCKkDPRuOjn', // Kris Grey
  '5SjvqHuCejtD6q6gGa3q29', // DJ Session One
  '4DUS9SX3NDld2Um49K0Cas', // DJ Neo (Harddance)
  '5uEQHmSsE1t0rrHRBRQiPv', // Silverblue
  '5XuEu3HhkQqETUbam43a8p', // Pila & Blutonium Boy
  // …weitere Acts fügen wir nach und nach hinzu
]


type Cached = { value: string; exp: number }
let cachedToken: Cached = { value: '', exp: 0 }

export async function getSpotifyToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken.value && now < cachedToken.exp) return cachedToken.value

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('Missing Spotify credentials')

  const body = new URLSearchParams({ grant_type: 'client_credentials' })
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  })

  const data = await res.json()
  if (!res.ok || !data.access_token) {
    console.error('Spotify token error:', data)
    throw new Error('Spotify token failed')
  }

  // Cache bis kurz vor Ablauf
  const expiresIn = Number(data.expires_in ?? 3600)
  cachedToken = {
    value: data.access_token,
    exp: now + (expiresIn - 30) * 1000
  }
  return cachedToken.value
}
