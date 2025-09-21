export default function SuccessPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Danke für deine Bestellung!</h1>
      <p className="mt-3 text-white/70">
        Deine Zahlung war erfolgreich. Du erhältst gleich eine Bestätigung per E-Mail.
      </p>
      <a href="/de/merch" className="btn mt-6 inline-flex">Zurück zum Shop</a>
    </div>
  );
}