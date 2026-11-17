"use client";

import { motion } from "framer-motion";
import { dict, type Lang } from "@/lib/i18n";
import { PERIODS, type PeriodKey } from "./engine";

/**
 * Animated segmented control for the backtest period. The selected pill
 * slides horizontally via a shared layoutId so switching periods feels fluid.
 */
export default function PeriodTabs({
  lang,
  value,
  onChange,
  maxMonths,
  disabled = false,
}: {
  lang: Lang;
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
  /** Longest period the loaded history supports; longer tabs are disabled. */
  maxMonths: number;
  disabled?: boolean;
}) {
  const labels = dict[lang].dca.periods;

  return (
    <div
      role="tablist"
      aria-label={dict[lang].dca.title}
      className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.03] p-1"
    >
      {PERIODS.map((period) => {
        const selected = period.key === value;
        const unavailable = period.months > maxMonths;
        const label = labels[period.key];
        return (
          <button
            key={period.key}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={disabled || unavailable}
            onClick={() => onChange(period.key)}
            className={`relative flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
              selected ? "text-white" : "text-slate-500 hover:text-slate-200"
            }`}
          >
            {selected && (
              <motion.span
                layoutId="dca-period-pill"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/30 to-purple-500/30 ring-1 ring-purple-400/30"
              />
            )}
            <span className="relative">{label}</span>
            {period.pro && (
              <span className="relative rounded bg-gradient-to-r from-amber-400/25 to-purple-400/25 px-1 py-px text-[8px] font-bold tracking-wider text-amber-300">
                PRO
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
