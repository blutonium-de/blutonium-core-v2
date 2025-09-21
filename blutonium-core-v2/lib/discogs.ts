// lib/discogs.ts
// Optionaler Discogs-Abgleich für CatNo + Credits.
// Aktiv, sobald DISCOGS_KEY und DISCOGS_SECRET gesetzt sind.

const D_KEY = process.env.DISCOGS_KEY
const D_SECRET = process.env.DISCOGS_SECRET
const BASE = 'https://api.discogs.com'

export type DiscogsInfo = {
  catalogNumber?: string | null
  credits?: string[]
}

function hasCreds() {
  return Boolean(D_KEY && D_SECRET)
}

async function discogsFetch(path: string) {
  const url = new URL(BASE + path)
  url.searchParams.set('key', D_KEY as string)
  url.searchParams.set('secret', D_SECRET as string)
  const r = await fetch(url.toString(), { headers: { 'User-Agent': 'BlutoniumWeb/1.0' }, cache: 'no-store' })
  if (!r.ok) throw new Error('Discogs fetch failed ' + r.status)
  return r.json()
}

export async function lookupDiscogs(artist: string, title: string, year?: number): Promise<DiscogsInfo | null> {
  if (!hasCreds()) return null

  // 1) Suche nach Release
  const q = new URLSearchParams({
    artist,
    release_title: title,
    type: 'release',
    per_page: '5',
    page: '1'
  })
  if (year) q.set('year', String(year))

  const searchUrl = `/database/search?${q.toString()}`
  const search = await discogsFetch(searchUrl)
  const item = (search.results || [])[0]
  if (!item || !item.id) return null

  // 2) Details ziehen
  const rel = await discogsFetch(`/releases/${item.id}`)
  const cat = rel?.labels?.[0]?.catno || null

  // Credits zusammensetzen (einfacher String)
  const credits: string[] = []
  if (Array.isArray(rel?.extraartists)) {
    for (const c of rel.extraartists) {
      const role = c?.role ? ` – ${c.role}` : ''
      if (c?.name) credits.push(`${c.name}${role}`)
    }
  }

  return { catalogNumber: cat, credits }
}
