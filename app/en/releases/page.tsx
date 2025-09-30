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
        Newest first. Latest years are preloaded.
      </p>

      <ReleasesGrid />
    </div>
  );
}