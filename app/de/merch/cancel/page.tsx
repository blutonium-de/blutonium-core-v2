export default function CancelPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Zahlung abgebrochen</h1>
      <p className="mt-3 text-white/70">
        Kein Problem – du kannst es jederzeit erneut versuchen.
      </p>
      <a href="/de/merch" className="btn mt-6 inline-flex">Zurück zum Shop</a>
    </div>
  );
}