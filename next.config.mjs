// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ⬅️ WICHTIG: zwingt Server-Build, verhindert Static Export (der die Errors erzeugt)
  output: "standalone",

  // optional, schadet nicht – verhindert, dass ESLint einen CI-Build abbricht
  eslint: { ignoreDuringBuilds: true },

  // good default
  reactStrictMode: true,

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

      // Samples-Altlinks → Shop
      { source: "/samples",    destination: "/de/shop", permanent: true },
      { source: "/de/samples", destination: "/de/shop", permanent: true },

      // Admin
      { source: "/de/admin", destination: "/admin", permanent: true },
    ];
  },

  async headers() {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",

      // Scripts (Next, Tailwind, PayPal, Stripe)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.paypal.com https://*.paypalobjects.com https://js.stripe.com",
      "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://*.paypal.com https://*.paypalobjects.com https://js.stripe.com",

      // Frames (PayPal, Stripe, optional YouTube)
      "frame-src 'self' https://*.paypal.com https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com https://www.youtube.com https://www.youtube-nocookie.com",

      // XHR/fetch
      "connect-src 'self' https://*.paypal.com https://*.paypalobjects.com https://api.stripe.com",

      // Images (local, data, Spotify, PayPal, YouTube thumbs)
      "img-src 'self' data: blob: https://i.scdn.co https://*.paypalobjects.com https://i.ytimg.com https://img.youtube.com https://yt3.ggpht.com",

      // Styles/Fonts
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",

      // Workers
      "worker-src 'self' blob:",
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