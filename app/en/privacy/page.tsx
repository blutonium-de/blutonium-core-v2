// app/en/privacy/page.tsx
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">Privacy Policy</h1>

      <div className="space-y-6 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold mb-2">1. Controller</h2>
          <p>
            Blutonium Media, Owner: Dirk Adamiak<br />
            Bahnhofstraße 27, 4650 Lambach, Austria<br />
            Email: <a className="underline" href="mailto:shop@blutonium.de">shop@blutonium.de</a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">2. Data we process</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Name, address, email, optional phone number</li>
            <li>Order data (products, quantity, price)</li>
            <li>Payment data (processed by Stripe)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">3. Payments via Stripe</h2>
          <p>
            Payments are processed by Stripe Payments Europe, Ltd. Payment data
            is transmitted to Stripe. Further info:&nbsp;
            <a className="underline" href="https://stripe.com/privacy" target="_blank" rel="noreferrer">
              stripe.com/privacy
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">4. Cookies & LocalStorage</h2>
          <p>
            We use cookies and LocalStorage to store your cart, remember preferences,
            and collect anonymous usage statistics. On your first visit we ask for
            consent, which you can withdraw at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">5. Third-party services</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Spotify API (displaying releases)</li>
            <li>Stripe (payments)</li>
            <li>Hosting & optional analytics: Vercel</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">6. Retention</h2>
          <p>
            We store personal data only as long as required to fulfill your order
            or due to legal obligations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">7. Your rights</h2>
          <p>
            You have the right to access, rectification, erasure, restriction of processing,
            and data portability. Contact:{" "}
            <a className="underline" href="mailto:shop@blutonium.de">shop@blutonium.de</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">8. Complaints</h2>
          <p>
            You may lodge a complaint with your local data protection authority.
            In Austria this is the Datenschutzbehörde.
          </p>
        </section>
      </div>
    </main>
  );
}