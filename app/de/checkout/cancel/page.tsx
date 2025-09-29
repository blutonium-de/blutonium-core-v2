// app/de/checkout/cancel/page.tsx
import Link from "next/link";

export default function CheckoutCancel() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold">Checkout abgebrochen</h1>
      <p className="mt-2 opacity-80">Kein Problem – du kannst deine Auswahl jederzeit bearbeiten.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/de/cart" className="rounded bg-white/10 hover:bg-white/20 px-4 py-2">Zurück zum Warenkorb</Link>
        <Link href="/de/shop" className="rounded bg-cyan-500 text-black px-4 py-2 font-semibold hover:bg-cyan-400">Weiter shoppen</Link>
      </div>
    </div>
  );
}