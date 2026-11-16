"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Monthly contribution control: a range slider plus a value that can be
 * clicked to type an exact amount. Both directions stay in sync and the
 * committed value is clamped to [min, max] and snapped to `step`.
 */
export default function MonthlyControl({
  label,
  value,
  onChange,
  min,
  max,
  step,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const clamp = (n: number) => {
    const snapped = Math.round(n / step) * step;
    return Math.min(max, Math.max(min, snapped));
  };

  const commit = () => {
    const parsed = Number(draft.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) onChange(clamp(parsed));
    setEditing(false);
  };

  return (
    <label className="flex w-full max-w-xs items-center gap-3 text-[11px] text-slate-500">
      <span className="whitespace-nowrap">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1 flex-1 cursor-pointer accent-purple-500 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={label}
      />
      {editing ? (
        <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-slate-200">
          <span aria-hidden>$</span>
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={step}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
              if (event.key === "Escape") setEditing(false);
            }}
            className="w-16 rounded-md border border-purple-400/40 bg-white/[0.06] px-1.5 py-0.5 text-right text-xs tabular-nums text-white outline-none"
            aria-label={label}
          />
        </span>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setEditing(true)}
          title={label}
          className="w-16 shrink-0 cursor-text rounded-md border border-transparent px-1.5 py-0.5 text-right text-xs font-medium tabular-nums text-slate-200 transition hover:border-purple-400/30 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
        >
          ${value}
        </button>
      )}
    </label>
  );
}
