"use client";

import { useState } from "react";

import { dict, type Lang } from "@/lib/i18n";
import { useSession } from "@/lib/use-session";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import PricingModal from "./PricingModal";

type Variant = "primary" | "secondary" | "link";

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    "btn-primary inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold text-white",
  secondary:
    "btn-secondary inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium text-white",
  link: "inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-purple-300 transition hover:text-purple-200",
};

/**
 * Any "Upgrade to Pro" call-to-action: renders the button and owns the
 * dark plan-comparison dialog (`PricingModal`) it opens.
 *
 * Anonymous visitors are sent to the auth modal first — signed-in users get the
 * comparison dialog, and the Creem checkout request is only fired from inside
 * it, never directly from this button.
 */
export default function ProUpgradeButton({
  lang,
  label,
  variant = "primary",
  className = "",
  source,
}: {
  lang: Lang;
  label?: string;
  variant?: Variant;
  className?: string;
  source?: string;
}) {
  const [open, setOpen] = useState(false);
  const { user, ready } = useSession();
  const { openAuthModal } = useAuthModal();
  const text = label ?? dict[lang].pro.upgrade;

  const handleClick = () => {
    // Never decide from a half-initialised session.
    if (!ready) return;
    if (!user) {
      openAuthModal({ mode: "login", lang });
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={!ready}
        className={`${VARIANT_CLASS[variant]} ${className}`}
      >
        {text}
        {variant !== "link" && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-3.5 w-3.5 shrink-0"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <PricingModal open={open} onClose={() => setOpen(false)} source={source} />
    </>
  );
}