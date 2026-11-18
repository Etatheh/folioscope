"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { isAdminTier, isProTier } from "@/lib/access";
import { apiFetch } from "@/lib/client-api";
import { PLANS, type PlanId } from "@/lib/plans";
import { useProfile } from "@/lib/use-profile";
import { useSession } from "@/lib/use-session";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import LegalInlineLinks from "@/components/legal/LegalInlineLinks";

type BillingCycle = "monthly" | "yearly";
type CheckoutStatus = "idle" | "busy" | "error";

type CheckoutConfig = {
  ok?: boolean;
  configured?: boolean;
  monthly?: boolean;
  yearly?: boolean;
};

type CheckoutResponse = {
  ok?: boolean;
  url?: string;
  checkout_url?: string;
  error?: string;
  demo?: boolean;
};

const CYCLE_COPY: Record<
  BillingCycle,
  { price: string; period: string; label: string; note?: string }
> = {
  monthly: { price: "$9", period: "/ month", label: "Monthly", note: "$9/mo" },
  yearly: {
    price: "$79",
    period: "/ year",
    label: "Yearly",
    note: "$79/yr · Save 34%",
  },
};

function plan(id: PlanId) {
  return PLANS.find((item) => item.id === id) ?? PLANS[0];
}

export default function PricingPlans() {
  const { user, ready } = useSession();
  const { profile } = useProfile();
  const { openAuthModal } = useAuthModal();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [status, setStatus] = useState<CheckoutStatus>("idle");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/checkout", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: CheckoutConfig) => {
        if (!cancelled) setConfig(data);
      })
      .catch(() => {
        if (!cancelled) setConfig({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const yearlyAvailable = config?.yearly === true;
  const pro = plan("pro");
  const free = plan("free");
  const copy = CYCLE_COPY[cycle];
  const isPro = isProTier(profile?.tier);

  const handleUpgrade = async () => {
    if (!ready) return;
    if (!user) {
      openAuthModal({ mode: "login", lang: "en" });
      return;
    }

    setStatus("busy");
    try {
      const response = await apiFetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingCycle: cycle }),
      });
      const data = (await response
        .json()
        .catch(() => ({}))) as CheckoutResponse;

      if (response.status === 401) {
        const next = encodeURIComponent("/pricing");
        window.location.href = `/login?redirect=${next}`;
        return;
      }

      const url = data.checkout_url ?? data.url;
      if (response.ok && url) {
        window.location.href = url;
        return;
      }

      setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="mt-14 grid gap-5 md:grid-cols-2">
      {/* Free */}
      <article className="glass rounded-2xl p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{free.name}</h2>
        </div>
        <p className="mt-4 text-3xl font-bold text-white">
          {free.price}
          <span className="text-sm font-normal text-slate-500">
            {" "}
            {free.period}
          </span>
        </p>
        <p className="mt-1 text-xs text-slate-500">{free.tagline}</p>
        <ul className="mt-6 space-y-2.5 text-sm text-slate-400">
          {free.features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <span className="text-emerald-400">✓</span>
              {feature}
            </li>
          ))}
        </ul>
        <Link
          href="/register"
          className="btn-secondary mt-8 block rounded-full py-3 text-center text-sm font-medium text-white"
        >
          Start for free
        </Link>
        <LegalInlineLinks className="mt-3" />
      </article>

      {/* Pro */}
      <article className="glass rounded-2xl border-purple-400/40 p-8 ring-1 ring-purple-400/20">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{pro.name}</h2>
          <span className="rounded-full bg-gradient-to-r from-amber-400/20 to-purple-400/20 px-2.5 py-1 text-[10px] text-amber-300">
            Recommended
          </span>
        </div>

        {yearlyAvailable ? (
          <div
            role="radiogroup"
            aria-label="Billing cycle"
            className="mt-4 grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1"
          >
            <button
              type="button"
              role="radio"
              aria-checked={cycle === "monthly"}
              onClick={() => setCycle("monthly")}
              className={`rounded-full px-3 py-1.5 text-center text-[11px] font-medium transition ${
                cycle === "monthly"
                  ? "bg-gradient-to-r from-purple-500/40 to-blue-500/30 text-white ring-1 ring-purple-400/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {CYCLE_COPY.monthly.note}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={cycle === "yearly"}
              onClick={() => setCycle("yearly")}
              className={`rounded-full px-3 py-1.5 text-center text-[11px] font-medium transition ${
                cycle === "yearly"
                  ? "bg-gradient-to-r from-purple-500/40 to-blue-500/30 text-white ring-1 ring-purple-400/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {CYCLE_COPY.yearly.note}
            </button>
          </div>
        ) : (
          <div className="mt-4 h-[38px]" aria-hidden />
        )}

        <p className="mt-4 text-3xl font-bold text-white">
          {copy.price}
          <span className="text-sm font-normal text-slate-500">
            {" "}
            {copy.period}
          </span>
        </p>
        <p className="mt-1 text-xs text-slate-500">{pro.tagline}</p>
        <ul className="mt-6 space-y-2.5 text-sm text-slate-400">
          {pro.features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <span className="text-emerald-400">✓</span>
              {feature}
            </li>
          ))}
        </ul>

        {!ready ? (
          <div className="mt-8 h-11 animate-pulse rounded-full bg-white/5" />
        ) : isPro ? (
          <span className="mt-8 block rounded-full bg-emerald-400/10 py-3 text-center text-sm text-emerald-400">
            {isAdminTier(profile?.tier)
              ? "Developer access · all unlocked"
              : "Pro active ✓"}
          </span>
        ) : (
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={status === "busy"}
            className="btn-primary mt-8 block w-full rounded-full py-3 text-center text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "busy"
              ? "Opening checkout…"
              : user
                ? "Upgrade to Pro"
                : "Sign in to upgrade"}
          </button>
        )}

        {status === "error" && (
          <p role="alert" className="mt-2 text-center text-[11px] text-rose-300">
            Checkout is unavailable right now. Please try again.
          </p>
        )}

        <LegalInlineLinks className="mt-3" />
      </article>
    </div>
  );
}