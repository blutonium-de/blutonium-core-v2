/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { allowedOrigins: ['*'] } },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.scdn.co' }, // Spotify
      { protocol: 'https', hostname: 'i.ytimg.com' } // YouTube
    ]
  }
}
export default nextConfig
