"use client";

import { useEffect, useRef, useState } from "react";
import type { Samples } from "./engine";

const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);

/**
 * Smoothly roll a number toward `target` over `duration` ms using
 * requestAnimationFrame. Returns the in-flight value; render it inside a
 * `tabular-nums` container so digits never jitter horizontally.
 */
export function useAnimatedNumber(target: number, duration = 320): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const from = current.current;
    const to = target;
    if (from === to || !Number.isFinite(to)) {
      current.current = to;
      setValue(to);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const next = from + (to - from) * easeOutCubic(p);
      current.current = next;
      setValue(next);
      if (p < 1) frame.current = requestAnimationFrame(tick);
      else current.current = to;
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [target, duration]);

  return value;
}

/**
 * Morph a resampled series toward `target` with a liquid ease-out. Both the
 * purple compound curve and the dashed principal line are interpolated
 * index-by-index (they always share SAMPLES length), and the y-scale (`max`)
 * eases alongside so the whole chart rises / falls like a fluid.
 */
export function useMorphSeries(target: Samples, duration = 340): Samples {
  const [anim, setAnim] = useState<Samples>(target);
  const current = useRef<Samples>(target);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const from = current.current;
    const to = target;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const e = easeOutCubic(p);
      const values = to.values.map((v, i) => {
        const f = from.values[i] ?? v;
        return f + (v - f) * e;
      });
      const invested = to.invested.map((v, i) => {
        const f = from.invested[i] ?? v;
        return f + (v - f) * e;
      });
      const lump = to.lump.map((v, i) => {
        const f = from.lump[i] ?? v;
        return f + (v - f) * e;
      });
      const max = from.max + (to.max - from.max) * e;
      const next = { values, invested, lump, max };
      current.current = next;
      setAnim(next);
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [target, duration]);

  return anim;
}
