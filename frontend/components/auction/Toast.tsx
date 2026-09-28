"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon, CrossIcon } from "./icons";

export type ToastTone = "info" | "success" | "warning" | "error";

interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

/** One toast at a time; a new one replaces the old. Auto-dismisses after 3.5s. */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number>();

  const show = useCallback((message: string, tone: ToastTone = "info") => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), message, tone });
    timer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { toast, show, dismiss };
}

const TONES: Record<ToastTone, string> = {
  info: "border-white/15 bg-gray-900/95 text-white",
  success: "border-emerald-400/40 bg-emerald-950/95 text-emerald-100",
  warning: "border-amber-400/40 bg-amber-950/95 text-amber-100",
  error: "border-red-500/40 bg-red-950/95 text-red-100",
};

export function ToastViewport({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-4 pt-[env(safe-area-inset-top)]"
    >
      {toast && (
        <div
          key={toast.id}
          className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl shadow-black/60 backdrop-blur animate-fade-up ${TONES[toast.tone]}`}
        >
          {toast.tone === "success" && <CheckIcon className="w-4 h-4 shrink-0 text-emerald-300" />}
          <p className="flex-1">{toast.message}</p>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
          >
            <CrossIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
