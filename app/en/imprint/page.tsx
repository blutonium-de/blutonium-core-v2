// app/en/imprint/page.tsx
export const dynamic = "force-dynamic";

export default function ImprintPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">Imprint / Legal Notice</h1>

      <div className="space-y-4 leading-relaxed">
        <p>
          <strong>Blutonium Media</strong><br />
          Owner: Dirk Adamiak<br />
          Bahnhofstraße 27<br />
          4650 Lambach<br />
          Austria
        </p>

        <p>
          <strong>Contact:</strong><br />
          Email: <a className="underline" href="mailto:shop@blutonium.de">shop@blutonium.de</a>
        </p>

        <p>
          <strong>VAT ID:</strong> ATU69730927
        </p>

        <p>
          <strong>Responsible for content (Sec. 55 (2) RStV):</strong><br />
          Dirk Adamiak, Bahnhofstraße 27, 4650 Lambach
        </p>

        <hr className="border-white/10 my-6" />

        <p className="text-sm opacity-70">
          Content created with utmost care. We accept no liability for external links.
        </p>
      </div>
    </main>
  );
}