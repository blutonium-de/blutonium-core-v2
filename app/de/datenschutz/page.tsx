// app/de/datenschutz/page.tsx
export const dynamic = "force-dynamic";

export default function DatenschutzPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">Datenschutzerklärung</h1>

      <div className="space-y-6 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold mb-2">1. Verantwortlicher</h2>
          <p>
            Blutonium Media, Inhaber: Dirk Adamiak<br />
            Bahnhofstraße 27, 4650 Lambach, Österreich<br />
            E-Mail: <a className="underline" href="mailto:shop@blutonium.de">shop@blutonium.de</a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">2. Verarbeitete Daten</h2>
          <p>
            Im Rahmen unseres Online-Shops verarbeiten wir u. a.:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Name, Anschrift, E-Mail-Adresse, ggf. Telefonnummer</li>
            <li>Bestelldaten (Produkte, Menge, Preis)</li>
            <li>Zahlungsdaten (Abwicklung über Stripe)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">3. Zahlungsabwicklung (Stripe)</h2>
          <p>
            Die Zahlung erfolgt über Stripe Payments Europe, Ltd. Dabei werden Zahlungsdaten
            an Stripe übermittelt. Weitere Informationen:{" "}
            <a className="underline" href="https://stripe.com/de/privacy" target="_blank" rel="noreferrer">
              stripe.com/de/privacy
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">4. Cookies & LocalStorage</h2>
          <p>
            Wir verwenden Cookies und LocalStorage, um den Warenkorb zu speichern, Einstellungen
            zu merken und anonyme Nutzungsstatistiken zu erheben. Beim ersten Besuch bitten wir
            um Ihre Einwilligung. Diese kann jederzeit widerrufen werden.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">5. Eingebundene Dienste Dritter</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Spotify API (Anzeige von Releases)</li>
            <li>Stripe (Zahlungsabwicklung)</li>
            <li>Hosting & ggf. Analytics: Vercel</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">6. Speicherdauer</h2>
          <p>
            Wir speichern personenbezogene Daten nur so lange, wie es für die Abwicklung Ihrer
            Bestellung oder aufgrund gesetzlicher Pflichten erforderlich ist.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">7. Ihre Rechte</h2>
          <p>
            Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der
            Verarbeitung sowie Datenübertragbarkeit. Kontakt:{" "}
            <a className="underline" href="mailto:shop@blutonium.de">shop@blutonium.de</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">8. Beschwerderecht</h2>
          <p>
            Sie haben das Recht, sich bei der zuständigen Datenschutzbehörde zu beschweren.
            In Österreich ist dies die Datenschutzbehörde.
          </p>
        </section>
      </div>
    </main>
  );
}