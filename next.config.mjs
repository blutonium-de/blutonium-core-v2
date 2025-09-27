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
};

export default nextConfig;