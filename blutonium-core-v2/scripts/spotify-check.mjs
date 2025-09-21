const id = process.env.SPOTIFY_CLIENT_ID
const secret = process.env.SPOTIFY_CLIENT_SECRET

if (!id || !secret) {
  console.error('ENV fehlt: SPOTIFY_CLIENT_ID oder SPOTIFY_CLIENT_SECRET')
  process.exit(1)
}

const auth = Buffer.from(`${id}:${secret}`).toString('base64')

fetch('https://accounts.spotify.com/api/token', {
  method: 'POST',
  headers: {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: 'grant_type=client_credentials'
})
.then(async (r) => {
  const text = await r.text()
  console.log('HTTP', r.status)
  console.log('RAW:', text)
  try {
    const json = JSON.parse(text)
    console.log('Parsed JSON keys:', Object.keys(json))
  } catch {
    console.log('Hinweis: Antwort war kein JSON (z.B. Rate-Limit)')
  }
})
.catch((e) => {
  console.error('Netzwerk-/Fetch-Fehler:', e)
  process.exit(2)
})
