import { headers } from "next/headers"

// Seite immer frisch laden (YouTube-Feed)
export const dynamic = "force-dynamic"

type YtItem = {
  id?: { videoId?: string }
  snippet?: {
    title?: string
    publishedAt?: string
    thumbnails?: { medium?: { url?: string }, high?: { url?: string } }
  }
}

async function getVideos(max = 12) {
  // Solide Origin bestimmen (Prod bei Vercel + local)
  const h = headers()
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000"
  const proto = h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https")
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`

  const res = await fetch(`${origin}/api/youtube?max=${max}`, {
    cache: "no-store",
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || `YouTube API ${res.status}`)
  }

  return (await res.json()) as { videos: YtItem[]; nextPageToken?: string | null }
}

export default async function VideosPage() {
  let videos: YtItem[] = []
  let error: string | null = null

  try {
    const data = await getVideos(12)
    videos = data.videos || []
  } catch (e: any) {
    error = e?.message || "Unbekannter Fehler beim Laden der Videos."
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-16">
      <header className="pt-10 pb-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Videos</h1>
        <p className="mt-3 text-white/80">
          Neueste Uploads vom offiziellen Blutonium Records YouTube-Kanal.
        </p>
      </header>

      {error && (
        <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          Fehler: {error}
        </div>
      )}

      {!error && (!videos || videos.length === 0) && (
        <div className="text-white/70 py-10">Aktuell keine Videos gefunden.</div>
      )}

      {!error && videos && videos.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((v, i) => {
            const id = v.id?.videoId
            const sn = v.snippet
            const thumb =
              sn?.thumbnails?.high?.url ||
              sn?.thumbnails?.medium?.url ||
              undefined
            if (!id || !sn?.title) return null
            return (
              <a
                key={`${id}-${i}`}
                href={`https://www.youtube.com/watch?v=${id}`}
                target="_blank"
                rel="noreferrer"
                className="group rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition"
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt={sn.title}
                    className="w-full aspect-video object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-video grid place-items-center text-white/40">
                    Kein Vorschaubild
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-semibold line-clamp-2 group-hover:text-cyan-300">
                    {sn.title}
                  </h3>
                  {sn.publishedAt && (
                    <p className="mt-1 text-xs text-white/60">
                      {new Date(sn.publishedAt).toLocaleDateString("de-AT", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}