// app/de/releases/page.tsx
export const dynamic = "force-dynamic";

import ReleasesGrid from "@/components/ReleasesGrid";

export default function ReleasesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <h1 className="text-3xl sm:text-4xl font-extrabold">
        Releases
      </h1>
      <p className="opacity-70 mt-1">
        Neueste zuerst. Die aktuellsten Jahre werden vollständig vorgeladen.
      </p>

      {/* Grid mit Sticky-Jahr-Navi */}
      <ReleasesGrid />
    </div>
  );
}