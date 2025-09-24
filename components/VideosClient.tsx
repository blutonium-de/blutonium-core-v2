// components/VideosClient.tsx
"use client";

import { useEffect, useState } from "react";

type VideoItem = {
  id: string;
  title: string;
  thumb: string;
  publishedAt: string;
  url: string;
};

type ApiResult = {
  videos: VideoItem[];
  nextPageToken?: string | null;
  error?: string;
  source?: string;
};

export default function VideosClient() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextToken, setNextToken] = useState<string | null>(null);

  const [query, setQuery] = useState<string>("");
  const [order, setOrder] = useState<"date" | "relevance" | "viewCount">("date");

  async function load({ reset = false }: { reset?: boolean } = {}) {
    try {
      setLoading(true);
      setError(null);

      const sp = new URLSearchParams();
      if (query.trim()) sp.set("q", query.trim());
      if (order) sp.set("order", order);
      sp.set("max", "12");
      if (!reset && nextToken) sp.set("pageToken", nextToken);

      const r = await fetch(`/api/youtube?${sp.toString()}`, { cache: "no-store" });
      const data = (await r.json()) as ApiResult;

      if (!r.ok) {
        throw new Error(data?.error || `YouTube API ${r.status}`);
      }

      setVideos((old) => (reset ? data.videos : [...old, ...data.videos]));
      setNextToken(data.nextPageToken ?? null);
    } catch (e: any) {
      setError(e?.message || "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }

  // Initialer Load
  useEffect(() => {
    load({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Suche abschicken (Enter)
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      load({ reset: true });
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-6">
        <div className="flex gap-2 w-full sm:w-auto">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Suche in Kanal-Videos…"
            className="flex-1 sm:w-80 rounded-md px-3 py-2 bg-white/10 border border-white/15 outline-none focus:ring-2 focus:ring-cyan-400/40"
          />
          <button
            onClick={() => load({ reset: true })}
            disabled={loading}
            className="rounded-md px-4 py-2 border border-white/15 bg-white/10 hover:bg-white/20 disabled:opacity-60"
          >
            Suchen
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-white/70">Sortierung:</label>
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value as any)}
            className="rounded-md px-3 py-2 bg-white/10 border border-white/15 outline-none focus:ring-2 focus:ring-cyan-400/40"
          >
            <option value="date">Neuste zuerst</option>
            <option value="relevance">Relevanz</option>
            <option value="viewCount">Aufrufe</option>
          </select>
          <button
            onClick={() => load({ reset: true })}
            disabled={loading}
            className="rounded-md px-3 py-2 border border-white/15 bg-white/10 hover:bg-white/20 disabled:opacity-60"
          >
            Anwenden
          </button>
        </div>
      </div>

      {/* Fehler */}
      {error && (
        <div className="mb-6 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm">
          Fehler: {error}
        </div>
      )}

      {/* Grid */}
      {(!loading && videos.length === 0 && !error) ? (
        <div className="py-16 text-center text-white/70">Keine Videos gefunden.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v) => (
            <a
              key={v.id}
              href={v.url}
              target="_blank"
              rel="noreferrer"
              className="group rounded-xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition"
            >
              <div className="aspect-video bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.thumb}
                  alt={v.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-3">
                <div className="text-xs text-white/60">{new Date(v.publishedAt).toLocaleDateString("de-AT")}</div>
                <div className="mt-1 line-clamp-2 font-medium group-hover:text-cyan-300">
                  {v.title}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Load more */}
      <div className="text-center">
        {nextToken && (
          <button
            onClick={() => load({ reset: false })}
            disabled={loading}
            className="mt-8 rounded-md px-4 py-2 border border-white/15 bg-white/10 hover:bg-white/20 disabled:opacity-60"
          >
            {loading ? "Laden …" : "Mehr laden"}
          </button>
        )}
      </div>
    </div>
  );
}