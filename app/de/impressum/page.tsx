// app/de/impressum/page.tsx
export const dynamic = "force-dynamic";

export default function ImpressumPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">Impressum</h1>

      <div className="space-y-4 leading-relaxed">
        <p>
          <strong>Blutonium Media</strong><br />
          Inhaber: Dirk Adamiak<br />
          Bahnhofstraße 27<br />
          4650 Lambach<br />
          Österreich
        </p>

        <p>
          <strong>Kontakt:</strong><br />
          E-Mail: <a className="underline" href="mailto:shop@blutonium.de">shop@blutonium.de</a>
        </p>

        <p>
          <strong>Umsatzsteuer-ID:</strong> ATU69730927
        </p>

        <p>
          <strong>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV:</strong><br />
          Dirk Adamiak, Bahnhofstraße 27, 4650 Lambach
        </p>

        <hr className="border-white/10 my-6" />

        <p className="text-sm opacity-70">
          Inhalte wurden mit größter Sorgfalt erstellt. Für externe Links übernehmen wir keine Haftung.
        </p>
      </div>
    </main>
  );
}