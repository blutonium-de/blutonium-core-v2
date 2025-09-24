// app/admin/catalog/page.tsx
import { CATEGORY_LABELS } from "@/lib/shop-categories"

export const dynamic = "force-dynamic"

function Guard({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const token = process.env.ADMIN_TOKEN || ""
  const t = typeof searchParams.t === "string" ? searchParams.t : ""
  if (!token || t !== token) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">403 – Forbidden</h1>
        <p className="text-white/70">Fehlender oder falscher Token.</p>
      </div>
    )
  }
  return null
}

export default function AdminCatalog({ searchParams }: any) {
  const deny = Guard({ searchParams })
  if (deny) return deny

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold">Kategorien & Codes</h1>
      <p className="mt-2 text-white/70">
        Diese Codes kannst du bei Produkten unter <code>category</code> verwenden.
      </p>

      <div className="mt-6 grid sm:grid-cols-2 gap-3">
        {Object.entries(CATEGORY_LABELS).map(([code, label]) => (
          <div key={code} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-lg font-semibold">{label}</div>
            <div className="text-sm text-white/70 mt-1">
              Code: <code className="text-white/90">{code}</code>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-sm text-white/60">
        URL: <code>/admin/catalog?t=DEIN_ADMIN_TOKEN</code><br />
        (Setze <code>ADMIN_TOKEN</code> in deiner <code>.env.local</code> bzw. in Vercel)
      </div>
    </div>
  )
}