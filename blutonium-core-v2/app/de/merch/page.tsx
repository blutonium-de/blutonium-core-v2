import Link from 'next/link'
export default function Page(){
  return (
    <section>
      <h1 className="text-3xl font-bold mb-6">Merchandise</h1>
      <p className="opacity-80">Demo-Shop. Produkte kommen über das Admin-Backend.</p>
      <div className="mt-6">
        <Link className="btn" href="/admin/products">Zum Admin (Demo)</Link>
      </div>
    </section>
  )
}
