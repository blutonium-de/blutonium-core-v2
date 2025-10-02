// app/admin/dvds/new/page.tsx
"use client";

import AdminDvdForm from "../../../../components/AdminDvdForm";

export const dynamic = "force-dynamic";

export default function AdminNewDvdPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl sm:text-4xl font-extrabold">Admin · DVD/Blu-ray anlegen</h1>
      </div>

      <p className="text-white/70 mt-2">
        Bilder-Upload, Kamera &amp; Barcode-Scan. DVD-Lookup füllt viele Felder automatisch.
      </p>

      <div className="mt-8">
        <AdminDvdForm />
      </div>
    </div>
  );
}