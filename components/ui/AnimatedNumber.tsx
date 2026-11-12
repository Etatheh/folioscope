"use client";

import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

type AnimatedNumberProps = {
  value: number;
  /** Decimal places (0–3). */
  digits?: number;
  /** Prefix positive values with "+". */
  signed?: boolean;
  /** Thousands separators. */
  group?: boolean;
  prefix?: string;
  suffix?: string;
  className?: string;
  title?: string;
  /** Seconds. Ignored when the visitor prefers reduced motion. */
  duration?: number;
};

const EASE = [0.22, 0.61, 0.36, 1] as const;

function formatNumber(
  value: number,
  {
    digits,
    signed,
    group,
    prefix,
    suffix,
  }: Pick<AnimatedNumberProps, "digits" | "signed" | "group" | "prefix" | "suffix">
): string {
  if (!Number.isFinite(value)) return "—";
  const magnitude = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: group,
  });
  const sign = value < 0 ? "-" : signed ? "+" : "";
  return `${sign}${prefix ?? ""}${magnitude}${suffix ?? ""}`;
}

/**
 * Renders a number that eases from its previous value to the next one.
 *
 * The first render prints the final formatted value (so server HTML and the
 * hydrated tree match exactly); only later value changes animate. The DOM text
 * is updated through a motion value instead of React state, so a price tick
 * never re-renders the surrounding card — and never flashes.
 *
 * Formatting is expressed with plain, serializable props (digits/signed/group)
 * so the component can be rendered from server components without passing a
 * function across the server/client boundary.
 */
export default function AnimatedNumber({
  value,
  digits = 2,
  signed = false,
  group = false,
  prefix,
  suffix,
  className,
  title,
  duration = 0.6,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  const motionValue = useMotionValue(value);
  const reduceMotion = useReducedMotion();

  const format = (next: number) =>
    formatNumber(next, { digits, signed, group, prefix, suffix });

  useEffect(() => {
    const from = previous.current;
    previous.current = value;

    if (!Number.isFinite(value)) {
      if (ref.current) ref.current.textContent = "—";
      return;
    }

    if (reduceMotion || from === value) {
      if (ref.current) ref.current.textContent = formatNumber(value, { digits, signed, group, prefix, suffix });
      motionValue.set(value);
      return;
    }

    motionValue.set(from);
    const controls = animate(motionValue, value, {
      duration,
      ease: EASE,
      onUpdate: (latest) => {
        if (ref.current) {
          ref.current.textContent = formatNumber(latest, { digits, signed, group, prefix, suffix });
        }
      },
    });
    return () => controls.stop();
  }, [value, digits, signed, group, prefix, suffix, duration, motionValue, reduceMotion]);

  return (
    <span ref={ref} className={className} title={title}>
      {format(value)}
    </span>
  );
}
