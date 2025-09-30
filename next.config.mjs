/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // ► Einsprachig: Alles auf DE
      { source: "/", destination: "/de", permanent: true },
      { source: "/en", destination: "/de", permanent: true },
      { source: "/en/:path*", destination: "/de/:path*", permanent: true },

      // Einheitliche DE-Pfade
      { source: "/releases", destination: "/de/releases", permanent: true },
      { source: "/videos",   destination: "/de/videos",   permanent: true },

      // Shop-Routen (alt -> neu)
      { source: "/merchandise",    destination: "/de/shop", permanent: true },
      { source: "/shop",           destination: "/de/shop", permanent: true },
      { source: "/de/merchandise", destination: "/de/shop", permanent: true },

      // Falls „Samples“-Links irgendwo existieren: aktuell zum Shop
      { source: "/samples",    destination: "/de/shop", permanent: true },
      { source: "/de/samples", destination: "/de/shop", permanent: true },

      // Admin: nur /admin (LE: /de/admin -> /admin)
      { source: "/de/admin", destination: "/admin", permanent: true },
    ];
  },

  async headers() {
    const csp = [
      // Grundschutz
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",

      // Skripte: PayPal SDK + Stripe.js (für Checkout/Apple Pay), inline für Next/Tailwind
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.paypal.com https://*.paypalobjects.com https://js.stripe.com",

      // explizit auch für Script-Elemente (einige Browser trennen das)
      "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://*.paypal.com https://*.paypalobjects.com https://js.stripe.com",

      // Frames: PayPal + Stripe (+ YouTube für evtl. Embeds)
      "frame-src 'self' https://*.paypal.com https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com https://www.youtube.com https://www.youtube-nocookie.com",

      // Verbindungen (XHR/fetch/EventSource/WebSocket): eigene API + PayPal/Stripe
      "connect-src 'self' https://*.paypal.com https://*.paypalobjects.com https://api.stripe.com",

      // Bilder: eigene, data/blob, Spotify-Cover, PayPal-Assets + YouTube-Thumbnails
      "img-src 'self' data: blob: https://i.scdn.co https://*.paypalobjects.com https://i.ytimg.com https://img.youtube.com https://yt3.ggpht.com",

      // Styles/Fonts
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",

      // Worker (für Next.js/Edge-Runtime/PayPal ggf.)
      "worker-src 'self' blob:",
      // Optional:
      // "upgrade-insecure-requests"
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;