/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Einheitliche DE-Pfade
      { source: "/releases",     destination: "/de/releases", permanent: true },
      { source: "/videos",       destination: "/de/videos",   permanent: true },

      // Shop-Routen (alt -> neu)
      { source: "/merchandise",      destination: "/de/shop", permanent: true },
      { source: "/shop",             destination: "/de/shop", permanent: true },
      { source: "/de/merchandise",   destination: "/de/shop", permanent: true },
      { source: "/de/merch",         destination: "/de/shop", permanent: true },

      // Falls „Samples“-Links irgendwo existieren, derzeit auch zum Shop
      { source: "/samples",          destination: "/de/shop", permanent: true },
      { source: "/de/samples",       destination: "/de/shop", permanent: true },
    ]
  },
}

export default nextConfig