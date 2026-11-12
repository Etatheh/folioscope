"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { dict, type Lang } from "@/lib/i18n";
import { useSession } from "@/lib/use-session";
import ProBadge from "./ProBadge";

type UpgradeStatus = "idle" | "busy" | "done" | "error";

type BillingConfigResponse = {
  ok?: boolean;
  configured?: boolean;
  url?: string;
  demo?: boolean;
  alreadyPro?: boolean;
};

const emptySubscribe = () => () => {};

/** True only after hydration — keeps the portal out of the server render. */
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export default function UpgradeModal({
  open,
  onClose,
  lang,
  source,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  /** Where the modal was opened from, for future analytics. */
  source?: string;
}) {
  const t = dict[lang].pro.modal;
  const { user, ready } = useSession();
  const mounted = useIsClient();
  const [status, setStatus] = useState<UpgradeStatus>("idle");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [usedDemo, setUsedDemo] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  const handleClose = useCallback(() => {
    setStatus("idle");
    setUsedDemo(false);
    onClose();
  }, [onClose]);

  // Ask the billing route once whether Lemon Squeezy keys are present.
  useEffect(() => {
    if (!open || configured !== null) return;
    let cancelled = false;
    fetch("/api/billing/checkout", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: BillingConfigResponse) => {
        if (!cancelled) setConfigured(Boolean(data.configured));
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, configured]);

  // Escape to close, lock background scroll, keep focus inside the dialog.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 60);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [open, handleClose]);

  const handleUpgrade = useCallback(async () => {
    setStatus("busy");
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as BillingConfigResponse;

      if (response.status === 401) {
        setStatus("idle");
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?next=${next}`;
        return;
      }

      if (response.ok && data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.alreadyPro) {
        setStatus("done");
        return;
      }

      // Billing is not connected yet: keep the flow usable in demo mode.
      const demo = await fetch("/api/auth/upgrade", { method: "POST" });
      if (demo.ok) {
        setUsedDemo(true);
        setStatus("done");
        window.setTimeout(() => window.location.reload(), 1200);
        return;
      }
      setStatus("error");
    } catch {
      setStatus("error");
    }
  }, []);

  if (!mounted) return null;

  const ctaLabel =
    status === "busy"
      ? configured === false
        ? t.demoBusy
        : t.ctaBusy
      : status === "done"
        ? t.done
        : configured === false
          ? t.ctaDemo
          : t.cta;

  const panel = (
    <motion.div
      key="pro-modal"
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pro-modal-title"
      aria-describedby="pro-modal-subtitle"
      initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
      transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
      className="glass-panel relative w-full max-w-lg overflow-hidden rounded-3xl p-6 text-slate-200 sm:p-7"
      data-source={source}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-purple-500/25 blur-[70px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-blue-500/20 blur-[70px]"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <ProBadge title={dict[lang].pro.badgeTip} />
          <h2
            id="pro-modal-title"
            className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl"
          >
            {t.title}
          </h2>
          <p id="pro-modal-subtitle" className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-slate-400">
            {t.subtitle}
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={handleClose}
          aria-label={t.close}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="relative mt-5 flex items-end gap-2 border-y border-white/10 py-4">
        <span className="text-3xl font-semibold tracking-tight text-white">{t.price}</span>
        <span className="pb-1 text-xs text-slate-500">{t.period}</span>
        {user?.plan === "pro" && (
          <span className="ml-auto rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] text-emerald-300">
            {dict[lang].pro.active}
          </span>
        )}
      </div>

      <div className="relative mt-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t.compare}</p>
        <table className="mt-2 w-full border-separate border-spacing-y-1 text-[13px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-500">
              <th scope="col" className="w-1/2 pb-1 text-left font-medium">
                {t.feature}
              </th>
              <th scope="col" className="pb-1 text-center font-medium">
                {t.free}
              </th>
              <th scope="col" className="pb-1 text-right font-medium text-amber-300">
                {t.pro}
              </th>
            </tr>
          </thead>
          <tbody>
            {t.rows.map((row) => (
              <tr key={row.label} className="align-middle">
                <th scope="row" className="rounded-l-lg bg-white/[0.03] py-1.5 pl-2.5 pr-2 text-left font-normal text-slate-300">
                  {row.label}
                </th>
                <td className="bg-white/[0.03] px-2 py-1.5 text-center text-slate-500">{row.free}</td>
                <td className="rounded-r-lg bg-purple-500/[0.08] px-2 py-1.5 text-right font-medium text-amber-200">
                  {row.pro}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="relative mt-5">
        {ready && !user ? (
          <Link
            href="/register"
            className="btn-primary block rounded-full py-3 text-center text-sm font-semibold text-white"
          >
            {t.login}
          </Link>
        ) : status === "done" ? (
          <span className="block rounded-full bg-emerald-400/10 py-3 text-center text-sm text-emerald-300">
            {t.done}
          </span>
        ) : (
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={status === "busy" || !ready}
            className="btn-primary w-full rounded-full py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {ctaLabel}
          </button>
        )}

        {status === "error" && (
          <p className="mt-2 text-center text-[11px] text-rose-300">{t.error}</p>
        )}

        {configured === false && status !== "done" && (
          <p className="mt-2 text-center text-[11px] leading-relaxed text-slate-500">
            {usedDemo ? t.demoBusy : t.demo}
          </p>
        )}

        <p className="mt-3 text-center text-[11px] text-slate-600">{t.cancel}</p>
      </div>
    </motion.div>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="pro-modal-backdrop"
          className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-[#03060d]/70 px-4 py-8 backdrop-blur-md"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={handleClose}
          role="presentation"
        >
          {panel}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
