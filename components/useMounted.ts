"use client";

import { useEffect, useState } from "react";

/** Returns true only after first client render (prevents SSR/CSR mismatches). */
export default function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}