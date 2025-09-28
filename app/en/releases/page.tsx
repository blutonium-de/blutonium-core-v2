// app/en/releases/page.tsx
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import ReleasesGrid from "../../../components/ReleasesGrid";

export default async function ReleasesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl sm:text-5xl font-extrabold">
        Blutonium Records Releases
      </h1>
      <p className="opacity-70 mt-2">
        Latest first. The most recent years are preloaded completely.
      </p>

      {/* Grid with year filter & lazy loading by year */}
      <ReleasesGrid />
    </div>
  );
}