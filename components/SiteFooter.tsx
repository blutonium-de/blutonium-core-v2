// components/SiteFooter.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteFooter() {
  const pathname = usePathname() || "/";
  const isEN = pathname.startsWith("/en");

  const year = new Date().getFullYear();

  const links = isEN
    ? [
        { href: "/en/imprint", label: "Imprint" },
        { href: "/en/privacy", label: "Privacy" },
      ]
    : [
        { href: "/de/impressum", label: "Impressum" },
        { href: "/de/datenschutz", label: "Datenschutz" },
      ];

  return (
    <footer className="border-t border-white/10 py-10 mt-16 text-sm opacity-80">
      <div className="max-w-6xl mx-auto px-4 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>© {year} Blutonium Records — Since 1995</div>
        <div className="flex items-center gap-3">
          {links.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              className="hover:opacity-100 underline decoration-white/30 hover:decoration-white"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}