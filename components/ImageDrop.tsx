// components/ImageDrop.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  max?: number;
  initial?: string[];                           // Start-Bilder (z. B. aus DB)
  onChange?: (images: string[], filenames?: string[]) => void;
};

export default function ImageDrop({ max = 5, initial = [], onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [filenames, setFilenames] = useState<string[]>([]);

  // DnD-Reordering
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Kamera
  const [camOpen, setCamOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialwerte aus DB reinziehen
  useEffect(() => {
    if (initial && initial.length) {
      const initImgs = initial.slice(0, max);
      setImages(initImgs);
      setFilenames(initial.map((_, i) => `image-${i + 1}.jpg`).slice(0, max));
    }
  }, [initial, max]);

  function handleOpenFiles() {
    inputRef.current?.click();
  }

  async function uploadToServer(files: FileList | File[] | null) {
    if (!files) return;
    const all = Array.isArray(files) ? files : Array.from(files);
    if (!all.length) return;

    const room = Math.max(0, max - images.length);
    const slice = all.slice(0, room);

    const fd = new FormData();
    for (const f of slice) {
      if (!/\.(heic|heif|jpe?g|png|webp)$/i.test(f.name)) {
        setError(`Nicht unterstützter Dateityp: ${f.name}`);
        continue;
      }
      fd.append("files", f);
    }

    try {
      setError(null);

      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const text = await res.text();
      let j: any; try { j = JSON.parse(text); } catch { j = { error: text || "Upload error" }; }

      if (!res.ok) {
        const msg = j?.error || "Upload fehlgeschlagen.";
        if (/heif|heic|plugin|not built|ERR_LIBHEIF/i.test(msg)) {
          setError("HEIC/HEIF konnte nicht konvertiert werden (Server ohne HEIF-Unterstützung).");
        } else setError(msg);
        return;
      }

      const newImgs = j.images?.map((x: any) => x.dataUrl) ?? [];
      const newNames = j.images?.map((x: any) => x.name) ?? [];

      const mergedImgs = [...images, ...newImgs].slice(0, max);
      const mergedNames = [...filenames, ...newNames].slice(0, max);

      setImages(mergedImgs);
      setFilenames(mergedNames);
      onChange?.(mergedImgs, mergedNames);
    } catch (e: any) {
      setError(e?.message || "Netzwerkfehler beim Upload.");
    }
  }

  // Kamera (getUserMedia)
  async function openCamera() {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCamOpen(true);
    } catch {
      setError("Kamera konnte nicht geöffnet werden. Erlaube den Kamerazugriff im Browser.");
    }
  }
  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOpen(false);
  }
  useEffect(() => {
    const video = videoRef.current;
    if (!camOpen || !video) return;
    const stream = streamRef.current;
    if (stream) {
      (video as any).srcObject = stream;
      video.play().catch(() => {});
    }
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [camOpen]);

  async function takePhoto() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    const size = 500;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    const vw = video.videoWidth || 1;
    const vh = video.videoHeight || 1;
    const scale = Math.max(size / vw, size / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    const dx = (size - dw) / 2;
    const dy = (size - dh) / 2;

    ctx.drawImage(video, dx, dy, dw, dh);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      await uploadToServer([file]);
      stopCamera();
    }, "image/jpeg", 0.9);
  }

  // Bild löschen
  function removeAt(idx: number) {
    const a = images.slice();
    const b = filenames.slice();
    a.splice(idx, 1);
    b.splice(idx, 1);
    setImages(a);
    setFilenames(b);
    onChange?.(a, b);
  }

  // --- Drag & Drop: Reorder ---
  function onDragStart(e: React.DragEvent<HTMLDivElement>, index: number) {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index)); // Firefox
  }
  function onDragOver(e: React.DragEvent<HTMLDivElement>, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }
  function onDragLeave() {
    setDragOverIndex((cur) => cur);
  }
  function onDrop(e: React.DragEvent<HTMLDivElement>, dropIndex: number) {
    e.preventDefault();
    const from = dragIndexRef.current;
    setDragOverIndex(null);
    dragIndexRef.current = null;
    if (from == null || from === dropIndex) return;

    const newImgs = images.slice();
    const newNames = filenames.slice();

    const [img] = newImgs.splice(from, 1);
    const [name] = newNames.splice(from, 1);
    newImgs.splice(dropIndex, 0, img);
    newNames.splice(dropIndex, 0, name);

    setImages(newImgs);
    setFilenames(newNames);
    onChange?.(newImgs, newNames);
  }
  function onDragEnd() {
    setDragOverIndex(null);
    dragIndexRef.current = null;
  }

  return (
    <div className="border-2 border-dashed border-white/20 rounded-lg p-4 text-center">
      <input
        type="file"
        accept=".heic,.heif,.jpg,.jpeg,.png,.webp,image/*"
        multiple
        ref={inputRef}
        onChange={(e) => uploadToServer(e.target.files)}
        className="hidden"
      />

      <div className="flex items-center justify-center gap-3 mb-2">
        <button type="button" onClick={handleOpenFiles} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">
          Dateien wählen
        </button>
        <button type="button" onClick={openCamera} className="px-3 py-2 rounded bg-cyan-500 text-black font-semibold hover:bg-cyan-400">
          Foto aufnehmen
        </button>
        <span className="opacity-70 text-sm">
          ({images.length}/{max}) – wir speichern als JPEG (500×500)
        </span>
      </div>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      {/* Thumbs (reorderable) */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {images.map((src, i) => {
          const isDragOver = dragOverIndex === i;
          return (
            <div
              key={i}
              className={`relative rounded select-none border transition
                ${isDragOver ? "border-cyan-400 ring-1 ring-cyan-400/50" : "border-white/20"}
              `}
              draggable
              onDragStart={(e) => onDragStart(e, i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, i)}
              onDragEnd={onDragEnd}
              title="Ziehen, um die Reihenfolge zu ändern"
            >
              <div className="w-full aspect-square overflow-hidden rounded cursor-grab active:cursor-grabbing bg-black/30">
                <img
                  src={src}
                  alt={`upload-${i}`}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="absolute left-1 top-1 text-[11px] px-1.5 py-0.5 rounded bg-black/60">
                #{i + 1}
              </div>

              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-black/80 border border-white/30 flex items-center justify-center hover:bg-black"
                title="Bild entfernen"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* Kamera-Modal */}
      {camOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-black rounded-lg border border-white/20 p-3">
            <video ref={videoRef} playsInline autoPlay muted className="w-full rounded bg-black" />
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={takePhoto} className="flex-1 px-3 py-2 rounded bg-cyan-500 text-black font-semibold hover:bg-cyan-400">
                Auslösen
              </button>
              <button type="button" onClick={stopCamera} className="flex-1 px-3 py-2 rounded bg-white/10 hover:bg-white/20">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}