// app/sitemap.ts
import type { MetadataRoute } from "next";
import { dvdLandingPresets } from "./de/shop/dvds/landing/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.blutonium.de";

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`,                lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/de/shop`,         lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/de/shop/dvds`,    lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
  ];

  const dvdLanding: MetadataRoute.Sitemap = dvdLandingPresets.map(p => ({
    url: `${base}/de/shop/dvds/landing/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...dvdLanding];
}