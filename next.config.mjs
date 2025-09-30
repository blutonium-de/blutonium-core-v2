/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Einheitliche DE-Pfade
      { source: "/releases", destination: "/de/releases", permanent: true },
      { source: "/videos",   destination: "/de/videos",   permanent: true },

      // Shop-Routen (alt -> neu)
      { source: "/merchandise",    destination: "/de/shop", permanent: true },
      { source: "/shop",           destination: "/de/shop", permanent: true },
      // /de/merchandise darf weiter umleiten,
      // aber /de/merch bleibt für den Warenkorb bestehen
      { source: "/de/merchandise", destination: "/de/shop", permanent: true },

      // Falls „Samples“-Links irgendwo existieren: aktuell zum Shop
      { source: "/samples",    destination: "/de/shop", permanent: true },
      { source: "/de/samples", destination: "/de/shop", permanent: true },

      // Admin: nur /admin (LE: /de/admin -> /admin)
      { source: "/de/admin", destination: "/admin", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.paypal.com https://*.paypalobjects.com",
              "frame-src 'self' https://*.paypal.com",
              "img-src 'self' data: https://*.paypal.com https://*.paypalobjects.com",
              "connect-src 'self' https://*.paypal.com https://*.paypalobjects.com",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;