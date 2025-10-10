// lib/spotify.ts
// Server-seitiger Spotify Helper: holt ein App-Token (Client Credentials) und cached es.
// Zusätzlich: force-Refresh & Invalidate für 401-Retrys.

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

// 👉 IDs der Artists, die wir auf der /artists-/releases-Seite zeigen wollen
export const ARTISTS = [
  "2qNYTspRpXKdl4MJ6TGC5T", // Blutonium Boy
  "19QmW7ALL7ZhCKkDPRuOjn", // Kris Grey
  "1aGVl7Sl6h7N55wkxaQ1U6", // Daniele Mondello
  "5vbmx7Q2CFSipF64kCGC3N", // Blutonium Boys
  "4zN8ra0g03fTzZbLhCplCj", // Thomas Trouble
  "4hspTreuR02Ej5LeJ7AHyC", // John Ferris
  // ggf. weitere …
];

type Cached = { value: string; exp: number };
let cachedToken: Cached = { value: "", exp: 0 };

/** Hilfsfunktion: Token-Cache verwerfen (z.B. nach 401) */
export function invalidateSpotifyToken() {
  cachedToken = { value: "", exp: 0 };
}

/** App-Token holen; mit optionalem force-Refresh */
export async function getSpotifyToken(opts?: { force?: boolean }): Promise<string> {
  const force = !!opts?.force;
  const now = Date.now();

  if (!force && cachedToken.value && now < cachedToken.exp) {
    return cachedToken.value;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing Spotify credentials");

  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    console.error("Spotify token error:", data);
    throw new Error("Spotify token failed");
  }

  const expiresIn = Number(data.expires_in ?? 3600);
  cachedToken = {
    value: data.access_token,
    // 30s Puffer vor Ablauf
    exp: now + (expiresIn - 30) * 1000,
  };

  return cachedToken.value;
}