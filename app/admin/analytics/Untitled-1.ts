import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [total, topPages, last30, uniqueTotal, uniqueLast30] = await Promise.all([
    prisma.pageView.count(),
    prisma.pageView.groupBy({
      by: ["path"],
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
      take: 10,
    }),
    prisma.pageView.count({
      where: { createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) } },
    }),
    prisma.pageView.groupBy({
      by: ["ipHash"],
      _count: { ipHash: true },
    }),
    prisma.pageView.groupBy({
      by: ["ipHash"],
      _count: { ipHash: true },
      where: { createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) } },
    }),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header mit Zurück-Button */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Analytics (einfach)</h1>
        <Link
          href="/admin"
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-sm transition"
        >
          ← Zurück zum Admin
        </Link>
      </div>

      {/* Zahlen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm opacity-70">Pageviews gesamt</h2>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm opacity-70">Unique Besucher gesamt</h2>
          <p className="text-2xl font-bold">{uniqueTotal.length}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm opacity-70">Pageviews letzte 30 Tage</h2>
          <p className="text-2xl font-bold">{last30}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm opacity-70">Unique Besucher letzte 30 Tage</h2>
          <p className="text-2xl font-bold">{uniqueLast30.length}</p>
        </div>
      </div>

      {/* Top-Seiten */}
      <h2 className="text-xl font-semibold mb-2">Top-Seiten (letzte 30 Tage)</h2>
      <table className="w-full border-collapse border border-white/10 rounded-xl overflow-hidden">
        <thead className="bg-white/10 text-sm">
          <tr>
            <th className="text-left px-3 py-2">Pfad</th>
            <th className="text-right px-3 py-2">Views</th>
          </tr>
        </thead>
        <tbody>
          {topPages.map((p) => (
            <tr key={p.path} className="border-t border-white/10">
              <td className="px-3 py-2">{p.path}</td>
              <td className="px-3 py-2 text-right">{p._count.path}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 text-xs opacity-60">
        * Unique Besucher werden als Anzahl unterschiedlicher IP-Hashes gezählt (mit Salz). DSGVO-freundlich.
      </p>
    </div>
  );
}