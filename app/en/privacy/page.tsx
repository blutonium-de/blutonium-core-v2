export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>

      <p>
        We process personal data (name, address, email, payment data) only as far as necessary
        to handle your orders.
      </p>

      <h2 className="text-xl font-semibold mt-6">Cookies & Local Storage</h2>
      <p>
        Our website uses cookies and local storage, e.g. for the shopping cart.
        On your first visit, you will be asked for consent.
      </p>

      <h2 className="text-xl font-semibold mt-6">Payment Provider</h2>
      <p>
        Payments are handled via <strong>Stripe</strong>. Data such as name, address
        and payment details will be transmitted to Stripe.
      </p>

      <h2 className="text-xl font-semibold mt-6">Third-Party Services</h2>
      <p>
        We use external services such as the Spotify API and Beatport to display
        information about our releases.
      </p>

      <h2 className="text-xl font-semibold mt-6">Contact</h2>
      <p>
        For privacy-related inquiries, please contact:<br />
        <a href="mailto:shop@blutonium.de" className="underline">shop@blutonium.de</a>
      </p>
    </div>
  );
}