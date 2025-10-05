// app/admin/new/page.tsx
"use client";

import AdminProductForm from "../../../components/AdminProductForm";

export const dynamic = "force-dynamic";

export default function AdminNewProductPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl sm:text-4xl font-extrabold">Admin · Produkt anlegen</h1>
      </div>

      <p className="text-white/70 mt-2">
        Bilder-Upload, Kamera &amp; Barcode-Scan. Discogs-Lookup füllt viele Felder automatisch.
      </p>

      <div className="mt-8">
        <AdminProductForm />
      </div>
    </div>
  );
}