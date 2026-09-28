"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  tone?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

/** Bottom sheet on phones, centred dialog on larger screens. Replaces window.confirm. */
export default function ConfirmDialog({ open, title, message, confirmLabel, tone = "primary", onConfirm, onCancel }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  // Parent re-renders every timer tick; keep the latest handler without re-running the focus effect
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

  useEffect(() => {
    if (!open) return;
    const returnFocus = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      returnFocus?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-up" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl shadow-black/70 animate-card-in pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6">
        <h2 id="confirm-title" className="font-display text-2xl font-bold uppercase tracking-wide text-white">
          {title}
        </h2>
        <div className="mt-2 text-sm leading-relaxed text-white/70">{message}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="h-12 rounded-xl border border-white/15 bg-white/5 px-5 font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`h-12 rounded-xl px-5 font-bold transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
              tone === "danger"
                ? "bg-red-500 text-white hover:bg-red-400 focus-visible:ring-red-400"
                : "bg-gradient-to-b from-amber-300 to-amber-500 text-black hover:brightness-110 focus-visible:ring-amber-300"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
