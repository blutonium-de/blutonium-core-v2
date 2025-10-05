import type { Metadata, Viewport } from "next";
import SiteLayout from "@/components/SiteLayout";

export const metadata: Metadata = {
  title: "Blutonium Records",
  description: "Seit 1995 — Hardstyle / Hardtrance / Hard Dance",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SiteLayout lang="de">{children}</SiteLayout>;
}