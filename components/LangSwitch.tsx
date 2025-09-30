// components/LangSwitch.tsx
"use client";
import { usePathname, useSearchParams } from "next/navigation";

export default function LangSwitch({ className = "" }: { className?: string }) {
  const pathname = usePathname() || "/";
  const search = useSearchParams();
  const qs = search?.toString();

  const isEN = pathname.startsWith("/en");
  const isDE = pathname.startsWith("/de");

  const twin = isEN
    ? pathname.replace(/^\/en(?=\/|$)/, "/de")
    : isDE
    ? pathname.replace(/^\/de(?=\/|$)/, "/en")
    : "/de";

  const href = qs ? `${twin}?${qs}` : twin;

  return (
    <a
      href={href}
      className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 hover:bg-white/15 px-3 py-1 text-sm ${className}`}
    >
      {isEN ? "DE" : "EN"}
    </a>
  );
}