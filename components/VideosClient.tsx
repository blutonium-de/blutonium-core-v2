"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Video {
  id: string
  title: string
  thumb: string
  publishedAt: string
  url: string
}

export default function VideosClient({ videos, debug }: { videos: Video[]; debug?: any }) {
  const [search, setSearch] = useState("")
  const [year, setYear] = useState("all")
  const [sort, setSort] = useState("newest")
  const [showDebug, setShowDebug] = useState(false)

  const years = Array.from(
    new Set(videos.map(v => new Date(v.publishedAt).getFullYear()))
  ).sort((a, b) => b - a)

  const filtered = videos
    .filter(v =>
      v.title.toLowerCase().includes(search.toLowerCase())
    )
    .filter(v =>
      year === "all" ? true : new Date(v.publishedAt).getFullYear().toString() === year
    )
    .sort((a, b) =>
      sort === "newest"
        ? new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        : new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
    )

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-4xl font-bold mb-2">Videos</h1>
      <p className="text-white/70 mb-6">
        Neueste Uploads vom offiziellen Blutonium Records YouTube-Kanal.
      </p>

      <div className="flex flex-wrap gap-3 mb-8">
        {/* Debug nur im Development */}
        {process.env.NODE_ENV === "development" && (
          <Button
            variant="outline"
            onClick={() => setShowDebug(!showDebug)}
          >
            Debug anzeigen
          </Button>
        )}

        <Input
          placeholder="Suche nach Titel..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />

        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Alle Jahre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Jahre</SelectItem>
            {years.map(y => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sortieren" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Neu → Alt</SelectItem>
            <SelectItem value="oldest">Alt → Neu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showDebug && (
        <pre className="bg-black/50 text-xs p-4 mb-6 rounded overflow-x-auto">
          {JSON.stringify(debug, null, 2)}
        </pre>
      )}

      {filtered.length === 0 ? (
        <p className="text-white/70">Keine aktuellen Videos gefunden.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(v => (
            <Link
              key={v.id}
              href={v.url}
              target="_blank"
              className="group rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-cyan-400 transition"
            >
              <div className="relative w-full aspect-video">
                <Image
                  src={v.thumb}
                  alt={v.title}
                  fill
                  className="object-cover group-hover:scale-105 transition"
                />
              </div>
              <div className="p-4">
                <p className="text-xs text-white/50 mb-1">
                  {new Date(v.publishedAt).toLocaleDateString("de-AT")}
                </p>
                <h3 className="font-semibold leading-snug line-clamp-2">
                  {v.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}