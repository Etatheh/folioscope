"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { PLANS_CONFIG, getBillingCopy, getPlanFeatures } from "@/config/plans";

import { useLanguage } from "@/components/LanguageProvider";
import { apiFetch } from "@/lib/client-api";

type CheckoutStatus = "idle" | "busy" | "error";

type CheckoutResponse = {
  ok?: boolean;
  url?: string;
  checkout_url?: string;
  error?: string;
};

type BillingCycle = "monthly" | "yearly";


const emptySubscribe = () => () => {};

/** True only after hydration — keeps the portal out of the server render. */
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      aria-hidden="true"
      className={`h-3.5 w-3.5 shrink-0 ${className}`}
    >
      <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`h-3.5 w-3.5 shrink-0 ${className}`}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Plan comparison dialog shown before the Creem hosted checkout.
 *
 * It is a confirmation step only: no payment request is made until the visitor
 * presses "Continue to Checkout". The checkout session is created through the
 * existing `/api/checkout` route, which returns the Creem redirect URL.
 */
export default function PricingModal({
  open,
  onClose,
  source,
}: {
  open: boolean;
  onClose: () => void;
  /** Where the dialog was opened from, kept for analytics parity. */
  source?: string;
}) {
  const lang = useLanguage();
  const zh = lang === "zh";
  const mounted = useIsClient();
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState<CheckoutStatus>("idle");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [yearlyAvailable, setYearlyAvailable] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  const busy = status === "busy";
  // Yearly can only stay selected while yearly billing is configured; derive
  // the effective cycle instead of syncing state inside an effect.
  const effectiveCycle: BillingCycle = yearlyAvailable ? cycle : "monthly";
  const copy = getBillingCopy("pro", effectiveCycle, lang);

  // Ask the checkout route once which billing cycles are actually sellable.
  // Only booleans come back — never keys or product IDs.
  useEffect(() => {
    if (!open || configLoaded) return;
    let cancelled = false;
    fetch("/api/checkout", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { yearly?: boolean }) => {
        if (cancelled) return;
        setYearlyAvailable(data.yearly === true);
        setConfigLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setConfigLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, configLoaded]);

  const handleClose = useCallback(() => {
    if (busy) return;
    setStatus("idle");
    onClose();
  }, [busy, onClose]);

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

  const handleCheckout = useCallback(async () => {
    if (busy) return;
    setStatus("busy");

    try {
      const response = await apiFetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingCycle: effectiveCycle }),
      });
      const data = (await response
        .json()
        .catch(() => ({}))) as CheckoutResponse;

      if (response.status === 401) {
        setStatus("idle");
        const next = encodeURIComponent(
          window.location.pathname + window.location.search
        );
        window.location.href = `/login?redirect=${next}`;
        return;
      }

      const checkoutUrl = data.checkout_url ?? data.url;
      if (response.ok && checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }

      setStatus("error");
    } catch {
      setStatus("error");
    }
  }, [busy, effectiveCycle]);

  if (!mounted) return null;

  const panel = (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-modal-title"
      aria-describedby="pricing-modal-subtitle"
      data-source={source}
      initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
      transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
      className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 text-slate-200 shadow-2xl shadow-black/70"
      onClick={(event) => event.stopPropagation()}
    >
      {/* Hairline highlight + soft terminal glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-purple-500/20 blur-[80px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 bottom-0 h-56 w-56 rounded-full bg-blue-500/15 blur-[80px]"
      />

      <div className="relative flex items-start justify-between gap-4 px-6 pb-2 pt-6 sm:px-8">
        <div>
          <h2
            id="pricing-modal-title"
            className="text-xl font-semibold tracking-tight text-white sm:text-2xl"
          >
            {zh ? "选择套餐" : "Choose your plan"}
          </h2>
          <p
            id="pricing-modal-subtitle"
            className="mt-1.5 max-w-md text-[13px] leading-relaxed text-slate-400"
          >
            {zh ? "对比免费版与 Pro 权益，然后前往安全结算。" : "Compare Free and Pro side by side, then continue to secure checkout."}
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={handleClose}
          aria-label={zh ? "关闭套餐对比" : "Close plan comparison"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg leading-none text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="relative mt-5 grid gap-4 px-6 pb-6 sm:px-8 md:grid-cols-2">
        {/* Free */}
        <section className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h3 className="text-base font-semibold text-white">Free</h3>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-white">
            {getBillingCopy("free", effectiveCycle, lang).price}
            <span className="ml-1 text-sm font-normal text-slate-500">
              {getBillingCopy("free", effectiveCycle, lang).period}
            </span>
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            {PLANS_CONFIG.free.tagline[lang]}
          </p>

          <ul className="mt-5 flex-1 space-y-2.5 text-[13px] leading-relaxed text-slate-400">
            {getPlanFeatures("free", lang).map((feature) => (
              <li key={feature} className="flex gap-2.5">
                <CheckIcon className="mt-[3px] text-slate-500" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled
            aria-disabled="true"
            className="mt-6 w-full cursor-not-allowed rounded-full border border-white/10 bg-white/[0.03] py-3 text-sm font-medium text-slate-500"
          >
            {zh ? "当前套餐" : "Current Plan"}
          </button>
        </section>

        {/* Pro */}
        <section className="relative flex flex-col overflow-hidden rounded-2xl border border-purple-400/30 bg-gradient-to-b from-purple-500/[0.08] to-white/[0.02] p-6 ring-1 ring-purple-400/15">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-purple-500/20 blur-[60px]"
          />
          <span className="absolute right-4 top-4 rounded-md bg-gradient-to-r from-amber-400/25 to-purple-400/25 px-2 py-1 text-[9px] font-bold tracking-[0.18em] text-amber-200 ring-1 ring-amber-300/30">
            PRO
          </span>

          <h3 className="pr-14 text-base font-semibold text-white">
            FolioScope Pro
          </h3>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-white">
            {copy.price}
            <span className="ml-1 text-sm font-normal text-slate-500">
              {copy.period}
            </span>
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            {PLANS_CONFIG.pro.tagline[lang]}
          </p>

          {yearlyAvailable && (
            <div
              role="radiogroup"
              aria-label="Billing cycle"
              className="mt-4 grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1"
            >
              {(["monthly", "yearly"] as BillingCycle[]).map((option) => {
                const active = effectiveCycle === option;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setCycle(option)}
                    className={`rounded-full px-3 py-2 text-center leading-tight transition ${
                      active
                        ? "bg-gradient-to-r from-purple-500/35 to-blue-500/25 text-white ring-1 ring-purple-400/35"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="block text-[11px] font-semibold">
                      {getBillingCopy("pro", option, lang).label}
                    </span>
                    <span
                      className={`mt-0.5 block text-[10px] ${
                        active ? "text-white/70" : "text-slate-500"
                      }`}
                    >
                      {getBillingCopy("pro", option, lang).note}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <ul className="mt-5 flex-1 space-y-2.5 text-[13px] leading-relaxed text-slate-300">
            {getPlanFeatures("pro", lang).map((feature) => (
              <li key={feature} className="flex gap-2.5">
                <CheckIcon className="mt-[3px] text-emerald-400" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={busy}
            className="mt-6 flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <>
                <Spinner className={reduceMotion ? "" : "animate-spin"} />
                {zh ? "正在连接结算…" : "Connecting to Checkout..."}
              </>
            ) : (
              <>
                {zh ? "前往结算" : "Continue to Checkout"}
                <span aria-hidden>→</span>
              </>
            )}
          </button>
          <p className="mt-2.5 text-center text-[10px] text-slate-600">
            {zh ? "Creem 安全结算 · 可随时取消" : "Secured by Creem · Cancel anytime"}
          </p>
        </section>
      </div>

      {status === "error" && (
        <p
          role="alert"
          className="relative mx-6 mb-6 rounded-xl border border-rose-500/25 bg-rose-500/[0.07] px-3.5 py-2.5 text-[11px] leading-relaxed text-rose-300 sm:mx-8"
        >
          {zh ? "暂时无法打开结算，请稍后重试。" : "Unable to start checkout. Please try again in a moment."}
        </p>
      )}
    </motion.div>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="pricing-modal-backdrop"
          role="presentation"
          className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-md"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={handleClose}
        >
          {panel}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
