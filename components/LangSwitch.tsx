"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function LangSwitch() {
  const pathname = usePathname() || "/";

  // Hilfsfunktion: entfernt vorhandenes Locale und setzt das gewünschte davor.
  function toLocale(path: string, locale: "de" | "en") {
    // strip führendes /de oder /en (auch wenn nur /de oder /en ohne Slash dahinter)
    const stripped = path.replace(/^\/(de|en)(?=\/|$)/, "");
    // zusammensetzen; wenn stripped leer ist, landen wir auf /<locale>
    return `/${locale}${stripped || ""}`;
  }

  const isGerman =
    pathname === "/de" ||
    pathname.startsWith("/de/") ||
    // falls Middleware / auf /de umleitet, behandeln wir nacktes "/" als DE
    pathname === "/";

  const target = isGerman ? toLocale(pathname, "en") : toLocale(pathname, "de");
  const label = isGerman ? "EN" : "DE";

  return (
    <Link
      href={target}
      className="px-2 py-1 text-sm rounded bg-white/10 hover:bg-white/20"
    >
      {label}
    </Link>
  );
}