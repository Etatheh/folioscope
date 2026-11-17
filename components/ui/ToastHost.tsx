"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const TOAST_EVENT = "indepth-toast";

/** Fire a toast from anywhere in the client bundle. */
export function showToast(message: string) {
  if (typeof window === "undefined" || !message) return;
  window.dispatchEvent(new CustomEvent<string>(TOAST_EVENT, { detail: message }));
}

export default function ToastHost() {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const onToast = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      if (typeof message === "string" && message.trim()) {
        setToast({ id: Date.now(), message });
      }
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.24 }}
          role="status"
          aria-live="polite"
          className="glass-panel fixed bottom-6 left-1/2 z-[120] flex w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl border-emerald-400/25 px-4 py-3 text-slate-100 shadow-2xl shadow-black/50"
          style={{ background: "rgba(10, 20, 31, 0.96)" }}
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/25">
            ✓
          </span>
          <p className="text-xs leading-relaxed">{toast.message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}