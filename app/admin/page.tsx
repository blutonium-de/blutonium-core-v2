// app/admin/page.tsx
import AdminProductForm from "../../components/AdminProductForm"

export const dynamic = "force-dynamic"

export default function AdminPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Admin · Produkt anlegen</h1>
      <p className="mt-2 text-white/70">
        Bilder-Upload & Auto-Erkennung folgen. Aktuell: Felder ausfüllen, „Speichern (Demo)“ schreibt in die Console.
      </p>

      <div className="mt-8">
        <AdminProductForm />
      </div>
    </div>
  )
}