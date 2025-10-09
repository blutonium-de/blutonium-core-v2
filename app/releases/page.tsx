// app/releases/page.tsx
import { redirect } from "next/navigation";

export default function Page() {
  // Weiterleitung auf die neue Seite
  redirect("/de/releases");
}