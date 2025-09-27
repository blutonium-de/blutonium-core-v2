// lib/spotify-adapter.ts
type AnyObj = Record<string, any>;

function asArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as AnyObj).items)) return (data as AnyObj).items;
  return [];
}

async function loadSpotifyModule() {
  const mod: AnyObj = await import("./spotify");
  // Mögliche Export-Namen
  const releaseFn =
    mod.fetchLabelReleases ||
    mod.getLabelReleases ||
    mod.fetchReleases ||
    mod.labelReleases ||
    mod.releases ||
    mod.default;

  const artistsFn =
    mod.fetchArtists ||
    mod.getArtists ||
    mod.labelArtists ||
    mod.artists ||
    mod.default;

  return { releaseFn, artistsFn };
}

// Probiert mehrere typische Signaturen
async function callWithVariants(fn: Function | undefined, variants: any[][]) {
  if (typeof fn !== "function") return [];
  for (const args of variants) {
    try {
      const out = await fn(...args);
      const arr = asArray(out);
      if (arr.length) return arr;
      // Wenn kein Array, aber truthy – trotzdem akzeptieren
      if (out && !Array.isArray(out)) return asArray(out);
    } catch {
      // weitere Variante probieren
    }
  }
  // Letzter Versuch ohne Args
  try {
    const out = await fn();
    return asArray(out);
  } catch {
    return [];
  }
}

// Heuristik: Release-Objekte vereinheitlichen
function normalizeRelease(x: AnyObj) {
  const images = x.images || x.album?.images || x.cover?.images || [];
  const image =
    x.cover ||
    x.image ||
    images?.[0]?.url ||
    x.album?.images?.[0]?.url ||
    null;

  return {
    id: String(x.id ?? ""),
    title:
      x.title ??
      x.name ??
      x.track?.name ??
      "",
    type:
      x.type ??
      x.album_type ??
      x.album?.album_type ??
      null,
    year:
      x.year ??
      x.release_year ??
      (x.release_date ? Number(String(x.release_date).slice(0, 4)) : undefined) ??
      (x.album?.release_date ? Number(String(x.album.release_date).slice(0, 4)) : undefined) ??
      null,
    artists:
      x.artists?.map((a: any) => a.name).join(", ") ??
      x.artist ??
      x.album?.artists?.map((a: any) => a.name).join(", ") ??
      null,
    label: x.label ?? null,
    catalog: x.catalog ?? x.catno ?? null,
    cover: image,
    spotifyUrl:
      x.spotifyUrl ??
      x.external_urls?.spotify ??
      x.album?.external_urls?.spotify ??
      null,
    appleUrl: x.appleUrl ?? null,
    beatportUrl: x.beatportUrl ?? null,
  };
}

// Heuristik: Artist-Objekte vereinheitlichen
function normalizeArtist(a: AnyObj) {
  const image =
    a.image ||
    a.images?.[0]?.url ||
    a.photo ||
    null;

  return {
    id: String(a.id ?? ""),
    name: a.name ?? "",
    image,
    followers:
      a.followers?.total ??
      a.followers ??
      null,
    genre:
      Array.isArray(a.genres) ? a.genres[0] ?? null : a.genre ?? null,
    spotifyUrl: a.external_urls?.spotify ?? a.spotifyUrl ?? null,
    appleUrl: a.appleUrl ?? null,
    beatportUrl: a.beatportUrl ?? null,
  };
}

export async function getReleasesFromSpotify() {
  const { releaseFn } = await loadSpotifyModule();

  const labelId =
    process.env.SPOTIFY_LABEL_ID ||
    process.env.NEXT_PUBLIC_SPOTIFY_LABEL_ID ||
    "";

  // Typische Varianten (ohne / mit Label-ID / mit Options)
  const arr = await callWithVariants(releaseFn, [
    [],
    [labelId],
    [{ labelId }],
    [{ labelId, market: "DE" }],
  ]);

  return arr.map(normalizeRelease);
}

export async function getArtistsFromSpotify() {
  const { artistsFn } = await loadSpotifyModule();

  // Häufig: kommaseparierte IDs in ENV
  const artistIds =
    (process.env.SPOTIFY_ARTIST_IDS ||
      process.env.NEXT_PUBLIC_SPOTIFY_ARTIST_IDS ||
      "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const arr = await callWithVariants(artistsFn, [
    [],
    [artistIds],
    [{ ids: artistIds }],
    [{ ids: artistIds, market: "DE" }],
  ]);

  return arr.map(normalizeArtist);
}