// next.config.mjs
import path from "node:path";

/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const PAYPAL_FRAMES = [
  "https://www.paypal.com",
  "https://*.paypal.com",
];
const PAYPAL_SCRIPTS = [
  "https://www.paypal.com",
  "https://*.paypal.com",
  "https://*.paypalobjects.com",
];
const PAYPAL_CONNECT = [
  "https://api-m.paypal.com",
  "https://*.paypal.com",
  "https://*.paypalobjects.com",
];

// In Dev zusätzlich Sandbox zulassen
if (!isProd) {
  PAYPAL_FRAMES.push("https://www.sandbox.paypal.com");
  PAYPAL_SCRIPTS.push("https://www.sandbox.paypal.com");
  PAYPAL_CONNECT.push("https://api-m.sandbox.paypal.com");
}

const nextConfig = {
  output: "standalone",       // ok; auf Vercel wird es ignoriert, schadet aber nicht
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: true,

  // ✨ WICHTIG: Aliase für alle "@/..."-Imports
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(process.cwd(), "."),
      "@/lib": path.resolve(process.cwd(), "lib"),
      "@/components": path.resolve(process.cwd(), "components"),
      "@/app": path.resolve(process.cwd(), "app"),
    };
    return config;
  },

  async redirects() {
    return [
      { source: "/", destination: "/de", permanent: true },
      { source: "/en", destination: "/de", permanent: true },
      { source: "/en/:path*", destination: "/de/:path*", permanent: true },
      { source: "/releases", destination: "/de/releases", permanent: true },
      { source: "/videos",   destination: "/de/videos",   permanent: true },
      { source: "/merchandise",    destination: "/de/shop", permanent: true },
      { source: "/shop",           destination: "/de/shop", permanent: true },
      { source: "/de/merchandise", destination: "/de/shop", permanent: true },
      { source: "/samples",    destination: "/de/shop", permanent: true },
      { source: "/de/samples", destination: "/de/shop", permanent: true },
      { source: "/de/admin", destination: "/admin", permanent: true },
    ];
  },

  async headers() {
    const cspParts = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",

      // Scripts (Next, PayPal, Stripe)
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${PAYPAL_SCRIPTS.join(" ")} https://js.stripe.com`,
      `script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' ${PAYPAL_SCRIPTS.join(" ")} https://js.stripe.com`,

      // Frames (PayPal, Stripe, YouTube)
      `frame-src 'self' ${PAYPAL_FRAMES.join(" ")} https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com https://www.youtube.com https://www.youtube-nocookie.com`,
      // Optionaler Compat-Alias
      `child-src 'self' ${PAYPAL_FRAMES.join(" ")} https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com https://www.youtube.com https://www.youtube-nocookie.com`,

      // XHR/fetch
      `connect-src 'self' ${PAYPAL_CONNECT.join(" ")} https://api.stripe.com`,

      // Images
      "img-src 'self' data: blob: https://i.scdn.co https://*.paypalobjects.com https://i.ytimg.com https://img.youtube.com https://yt3.ggpht.com",

      // Styles/Fonts
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",

      // Workers
      "worker-src 'self' blob:",
    ];

    const csp = cspParts.join("; ");

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