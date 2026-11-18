"use client";

import { useState } from "react";
import Link from "next/link";

import { dict, type Lang } from "@/lib/i18n";
import type { ViewerPlan } from "@/lib/access";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import PricingModal from "./PricingModal";

/**
 * "Unlock all stocks" tile. Anonymous visitors open the auth modal (sign up),
 * free accounts open the Pro comparison dialog, and paid users see the plan
 * link as a fallback.
 */
export default function UnlockCtaButton({
  lang,
  plan,
  count,
}: {
  lang: Lang;
  plan: ViewerPlan;
  count: number;
}) {
  const t = dict[lang].markets;
  const { openAuthModal } = useAuthModal();
  const [open, setOpen] = useState(false);

  const body = (
    <>
      <span className="text-2xl" aria-hidden>
        🔒
      </span>
      <p className="text-sm font-medium text-slate-200">
        {t.unlockAll} <span className="text-slate-500">(+{count})</span>
      </p>
      <p className="text-[11px] text-slate-500">{t.unlockHint}</p>
      <span className="mt-1 whitespace-nowrap text-xs text-purple-400 group-hover:text-purple-300">
        {plan === "anon" ? t.registerCta : t.upgradeCta}
      </span>
    </>
  );

  const surface =
    "group flex h-full min-h-[132px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-purple-400/30 bg-purple-500/[0.06] p-6 text-center transition hover:border-purple-400/60 hover:bg-purple-500/10";

  if (plan === "anon") {
    return (
      <button
        type="button"
        onClick={() => openAuthModal({ mode: "signup", lang })}
        className={surface}
      >
        {body}
      </button>
    );
  }

  if (plan === "free") {
    return (
      <>
        <button type="button" onClick={() => setOpen(true)} className={surface}>
          {body}
        </button>
        <PricingModal
          open={open}
          onClose={() => setOpen(false)}
          source="market-unlock"
        />
      </>
    );
  }

  return (
    <Link href="/pricing" className={surface}>
      {body}
    </Link>
  );
}