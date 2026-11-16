import type { DcaPoint } from "@/lib/dca";

export type PeriodKey = "m6" | "y1" | "y3" | "y5" | "y10";

export type Period = { key: PeriodKey; months: number; pro?: boolean };

export const PERIODS: Period[] = [
  { key: "m6", months: 6 },
  { key: "y1", months: 12 },
  { key: "y3", months: 36 },
  { key: "y5", months: 60 },
  { key: "y10", months: 120, pro: true },
];

export const DEFAULT_PERIOD: PeriodKey = "y5";

export function periodMonths(key: PeriodKey): number {
  return PERIODS.find((p) => p.key === key)?.months ?? 60;
}

/**
 * Fixed sample count for the animated path. Keeping every morph target at the
 * same length lets us lerp index-by-index without the curve ever tearing.
 */
export const SAMPLES = 120;

export type DcaCurvePoint = { month: string; value: number; invested: number };

export type DcaStats = {
  curve: DcaCurvePoint[];
  invested: number;
  finalValue: number;
  totalReturn: number;
  xirr: number | null;
  months: number;
};

/**
 * Money-weighted annual return for equally spaced monthly contributions.
 * Contributions happen at each month-end close; the final portfolio value is
 * valued at the last contribution date. This is the monthly equivalent of XIRR.
 */
export function computeXirr(
  points: DcaCurvePoint[],
  monthly: number,
  finalValue: number,
): number | null {
  if (points.length < 2 || monthly <= 0 || finalValue <= 0) return null;

  const years = (index: number) => index / 12;
  const npv = (rate: number) => {
    const base = 1 + rate;
    let value = 0;
    for (let index = 0; index < points.length; index += 1) {
      value -= monthly / Math.pow(base, years(index));
    }
    return value + finalValue / Math.pow(base, years(points.length - 1));
  };

  let low = -0.9999;
  let high = 1;
  const lowValue = npv(low);
  let highValue = npv(high);
  while (highValue > 0 && high < 10_000) {
    high *= 2;
    highValue = npv(high);
  }
  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue) || lowValue <= 0 || highValue >= 0) {
    return null;
  }

  for (let iteration = 0; iteration < 80; iteration += 1) {
    const mid = (low + high) / 2;
    if (npv(mid) > 0) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/** Run the DCA simulation over the trailing `months` month-end closes. */
export function computeDca(points: DcaPoint[], monthly: number, months: number): DcaStats {
  const slice = points.slice(-months);
  let units = 0;
  let invested = 0;
  const curve = slice.map((point) => {
    units += monthly / point.close;
    invested += monthly;
    return { month: point.month, value: units * point.close, invested };
  });

  const finalValue = curve.at(-1)?.value ?? 0;
  const totalReturn = invested > 0 ? finalValue / invested - 1 : 0;
  const xirr = computeXirr(curve, monthly, finalValue);

  return { curve, invested, finalValue, totalReturn, xirr, months: slice.length };
}

export type Samples = { values: number[]; invested: number[]; lump: number[]; max: number };

/** Linear-interpolate an arbitrary-length series onto exactly `n` samples. */
export function resample(values: number[], n: number): number[] {
  if (values.length === 0) return Array.from({ length: n }, () => 0);
  if (values.length === 1) return Array.from({ length: n }, () => values[0]);
  const out = new Array<number>(n);
  const last = values.length - 1;
  for (let i = 0; i < n; i += 1) {
    const pos = (i * last) / (n - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(last, lo + 1);
    const frac = pos - lo;
    out[i] = values[lo] + (values[hi] - values[lo]) * frac;
  }
  return out;
}

/**
 * Resample the active DCA curve and the comparison index onto the shared
 * SAMPLES grid so paths can morph smoothly. `domainMax` is a monthly-independent
 * y-domain (computed at the slider max) so dragging the contribution visibly
 * raises / lowers the curves instead of being cancelled by an auto-scaling axis.
 */
export function buildSamples(
  curve: DcaCurvePoint[],
  altCurve: DcaCurvePoint[],
  domainMax: number,
): Samples {
  const values = resample(curve.map((c) => c.value), SAMPLES);
  const invested = resample(curve.map((c) => c.invested), SAMPLES);
  const lump = resample(altCurve.map((c) => c.value), SAMPLES);
  const max = Math.max(domainMax, 1);
  return { values, invested, lump, max };
}

/** Read a resampled series at a normalised position t in [0, 1]. */
export function sampleAt(values: number[], t: number): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  const clamped = Math.min(1, Math.max(0, t));
  const pos = clamped * (values.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.min(values.length - 1, lo + 1);
  const frac = pos - lo;
  return values[lo] + (values[hi] - values[lo]) * frac;
}

export const fmtMoney = (value: number) =>
  Math.round(value).toLocaleString("en-US", { maximumFractionDigits: 0 });

export const fmtPct = (value: number) =>
  `${value >= 0 ? "+" : "-"}${Math.abs(value * 100).toFixed(1)}%`;

/** "2026-11" -> "26/11" for compact axis / tooltip labels. */
export const fmtMonthShort = (month: string) => month.slice(2).replace("-", "/");
