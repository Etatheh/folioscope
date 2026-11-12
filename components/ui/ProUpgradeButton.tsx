"use client";

import { useState } from "react";

import { dict, type Lang } from "@/lib/i18n";
import UpgradeModal from "./UpgradeModal";

type Variant = "primary" | "secondary" | "link";

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    "btn-primary inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white",
  secondary:
    "btn-secondary inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium text-white",
  link: "inline-flex items-center gap-1 text-xs font-medium text-purple-300 transition hover:text-purple-200",
};

/**
 * Any "Upgrade to Pro" call-to-action: renders the button and owns the
 * frosted-glass comparison dialog it opens.
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
  const text = label ?? dict[lang].pro.upgrade;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${VARIANT_CLASS[variant]} ${className}`}
      >
        {text}
        {variant !== "link" && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <UpgradeModal open={open} onClose={() => setOpen(false)} lang={lang} source={source} />
    </>
  );
}
