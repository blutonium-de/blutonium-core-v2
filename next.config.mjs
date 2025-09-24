/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Einheitliche DE-Pfade (Shortcuts oben halten)
      { source: "/releases", destination: "/de/releases", permanent: true },
      { source: "/videos",   destination: "/de/videos",   permanent: true },

      // Merchandise → Shop
      { source: "/merchandise",      destination: "/de/shop", permanent: true },
      { source: "/de/merchandise",   destination: "/de/shop", permanent: true },
      { source: "/de/merch",         destination: "/de/shop", permanent: true },

      // Samples (entfernt) → ebenfalls zum Shop
      { source: "/samples",    destination: "/de/shop", permanent: true },
      { source: "/de/samples", destination: "/de/shop", permanent: true },
    ]
  },
}

export default nextConfig