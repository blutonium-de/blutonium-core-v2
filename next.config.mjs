/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/releases", destination: "/de/releases", permanent: true },
      { source: "/videos",   destination: "/de/videos",   permanent: true },
      { source: "/merchandise", destination: "/de/shop", permanent: true },
      { source: "/shop",        destination: "/de/shop", permanent: true },
      { source: "/de/merchandise", destination: "/de/shop", permanent: true },
      { source: "/samples",    destination: "/de/shop", permanent: true },
      { source: "/de/samples", destination: "/de/shop", permanent: true },
      { source: "/de/admin", destination: "/admin", permanent: true },
    ];
  },
};

export default nextConfig;