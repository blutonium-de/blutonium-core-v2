// app/sitemap.ts
import type { MetadataRoute } from "next";
import dvdLandingPresets from "./de/shop/dvds/landing/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.blutonium.de";

  return [
    { url: base, lastModified: new Date() },
    ...dvdLandingPresets.map((preset) => ({
      url: `${base}/de/shop/dvds/landing/${preset.slug}`,
      lastModified: new Date(),
    })),
  ];
}