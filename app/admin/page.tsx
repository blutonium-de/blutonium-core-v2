// app/admin/page.tsx
import AdminProductForm from "@/components/AdminProductForm"

export const dynamic = "force-dynamic"

export default function AdminPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <AdminProductForm />
    </div>
  )
}