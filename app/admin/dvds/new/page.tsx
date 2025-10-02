// app/admin/dvds/new/page.tsx
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Leitet auf deine bestehende New-Form um – mit DVD-Defaults.
export default function NewDvdRedirect() {
  // category=dvd, format=DVD – kann die Form beim Mount übernehmen
  redirect("/admin/new?category=dvd&format=DVD");
}