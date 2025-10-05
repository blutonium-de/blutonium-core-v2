// components/ConfirmDialog.tsx
"use client";

import { useEffect, useRef } from "react";

type BaseProps = {
  open: boolean;
  title?: string;
  /** Primäre Nachricht unter dem Titel */
  message?: string;
  /** Beschreibungs-Alias (wird auf message gemappt) */
  description?: string;
  /** Beschriftung Bestätigen */
  confirmLabel?: string;
  /** Alias für confirmLabel */
  confirmText?: string;
  /** Beschriftung Abbrechen */
  cancelLabel?: string;
  /** Alias für cancelLabel */
  cancelText?: string;
  /** Farbton des Bestätigen-Buttons */
  tone?: "danger" | "default";
  /** Bestätigen-Handler */
  onConfirm: () => void | Promise<void>;
  /** Schließen/Abbrechen-Handler */
  onClose?: () => void;
  /** Alias für onClose */
  onCancel?: () => void;
};

export default function ConfirmDialog(rawProps: BaseProps) {
  // --- Normalisierung der Props (Aliases zusammenführen) ---
  const {
    open,
    title = "Bist du sicher?",
    // description alias -> message
    message: messageRaw,
    description,
    // confirmText alias -> confirmLabel
    confirmLabel: confirmLabelRaw,
    confirmText,
    // cancelText alias -> cancelLabel
    cancelLabel: cancelLabelRaw,
    cancelText,
    tone = "danger",
    onConfirm,
    // onCancel alias -> onClose
    onClose: onCloseRaw,
    onCancel,
  } = rawProps;

  const message =
    (typeof description === "string" && description) ||
    (typeof messageRaw === "string" && messageRaw) ||
    "Diese Aktion kann nicht rückgängig gemacht werden.";

  const confirmLabel =
    (typeof confirmText === "string" && confirmText) ||
    (typeof confirmLabelRaw === "string" && confirmLabelRaw) ||
    "Ja, löschen";

  const cancelLabel =
    (typeof cancelText === "string" && cancelText) ||
    (typeof cancelLabelRaw === "string" && cancelLabelRaw) ||
    "Abbrechen";

  const onClose = onCancel ?? onCloseRaw ?? (() => {});

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstBtnRef = useRef<HTMLButtonElement | null>(null);

  // ESC schließen + einfacher Focus-Trap
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button,[href],[tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (document.activeElement === last && !e.shiftKey) {
          e.preventDefault();
          first.focus();
        } else if (document.activeElement === first && e.shiftKey) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    firstBtnRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      onMouseDown={(e) => {
        // Klick auf Overlay -> schließen (außer Klick im Dialog)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-xl border border-white/15 bg-zinc-900 shadow-xl"
      >
        <div className="p-4 sm:p-5">
          <h2 id="confirm-title" className="text-lg font-semibold">
            {title}
          </h2>
          <p id="confirm-message" className="mt-2 text-sm text-white/80">
            {message}
          </p>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              ref={firstBtnRef}
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded bg-white/10 hover:bg-white/20"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`px-3 py-2 rounded font-semibold ${
                tone === "danger"
                  ? "bg-red-500 text-black hover:bg-red-400"
                  : "bg-cyan-500 text-black hover:bg-cyan-400"
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}