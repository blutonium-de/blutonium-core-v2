// components/ImageLightbox.tsx
"use client";

import { useEffect } from "react";

export default function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt?: string;
  onClose: () => void;
}) {
  // ESC zum Schließen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 500×500 Anzeige (dein Upload speichert bereits in 500px) */}
        <img
          src={src}
          alt={alt || "Bild"}
          width={500}
          height={500}
          className="w-[500px] h-[500px] object-contain rounded shadow-lg"
        />
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-black/80 border border-white/30 text-white flex items-center justify-center hover:bg-black"
          aria-label="Schließen"
          title="Schließen"
        >
          ✕
        </button>
      </div>
    </div>
  );
}