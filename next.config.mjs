/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Einheitliche DE-Pfade
      { source: "/merchandise", destination: "/de/merch", permanent: true },
      { source: "/videos",       destination: "/de/videos", permanent: true },
      { source: "/samples",      destination: "/de/samples", permanent: true },
      { source: "/releases",     destination: "/de/releases", permanent: true },

      // Falls versehentlich mal /de/merchandise verlinkt wurde:
      { source: "/de/merchandise", destination: "/de/merch", permanent: true },
    ]
  },
}

export default nextConfig