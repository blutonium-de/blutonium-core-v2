export const dynamic = 'force-dynamic'

type Video = { id:string; title:string; thumb?:string; publishedAt?:string }

function getBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  if (process.env.SITE_URL) return process.env.SITE_URL
  return 'http://localhost:3000'
}

async function getVideos(): Promise<Video[]> {
  const base = getBaseUrl()
  const r = await fetch(`${base}/api/youtube`, { cache: 'no-store' })
  const { videos } = await r.json()
  return (videos || []) as Video[]
}

export default async function Page(){
  const videos = await getVideos()
  return (
    <section>
      <h1 className="text-3xl font-bold mb-6">YouTube</h1>
      {videos.length === 0 && (
        <p className="opacity-80">Noch keine Videos – setze später deinen YT_API_KEY in Vercel.</p>
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        {videos.map(v=>(
          <article key={v.id} className="card overflow-hidden">
            <iframe className="w-full aspect-video" src={`https://www.youtube.com/embed/${v.id}`} title={v.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
            <div className="p-4"><h3 className="font-semibold">{v.title}</h3></div>
          </article>
        ))}
      </div>
    </section>
  )
}
