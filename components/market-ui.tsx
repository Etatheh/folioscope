import { useId } from "react";
import type { Technicals, UsQuote } from "@/lib/us-stocks";
import { dict, type Lang } from "@/lib/i18n";
import AnimatedNumber from "./ui/AnimatedNumber";

export const fmtPrice = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const fmtSigned = (n: number, digits = 2) =>
  `${n >= 0 ? "+" : "-"}${Math.abs(n).toFixed(digits)}`;

export const fmtCap = (usd: number, prefix = "$") =>
  usd >= 1e12
    ? `${prefix}${(usd / 1e12).toFixed(2)}T`
    : `${prefix}${(usd / 1e9).toFixed(0)}B`;

export const fmtHands = (v: number, lang: Lang = "en") =>
  lang === "zh"
    ? (v >= 1e8 ? `${(v / 1e8).toFixed(2)}亿手` : v >= 1e4 ? `${(v / 1e4).toFixed(2)}万手` : `${v}手`)
    : `${v.toLocaleString("en-US")} lots`;

export const fmtVolume = (v: number) =>
  v >= 1e9
    ? `${(v / 1e9).toFixed(2)}B`
    : v >= 1e6
      ? `${(v / 1e6).toFixed(1)}M`
      : v >= 1e3
        ? `${(v / 1e3).toFixed(1)}K`
        : String(v);

export function ChangeChip({ quote }: { quote: UsQuote }) {
  const up = quote.change >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs tabular-nums ${
        up ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400"
      }`}
    >
      {up ? "↑" : "↓"}{" "}
      <AnimatedNumber value={quote.change} digits={2} signed /> (
      <AnimatedNumber value={quote.changePct} digits={2} signed />%)
    </span>
  );
}

function monotonePath(ys: number[], step: number) {
  // Tangents are measured per sample on this evenly spaced time axis.
  const tangents = ys.map((y, i) => {
    if (i === 0) return ys[1] - y;
    if (i === ys.length - 1) return y - ys[i - 1];
    const before = y - ys[i - 1];
    const after = ys[i + 1] - y;
    // Level off at extrema and plateaus. Else limit the tangent to the gentler slope.
    return Math.sign(before) === Math.sign(after)
      ? Math.sign(after) * Math.min(Math.abs(before), Math.abs(after))
      : 0;
  });
  let path = `M0 ${ys[0]}`;
  for (let i = 1; i < ys.length; i++) {
    const control1 = `${(i - 2 / 3) * step} ${ys[i - 1] + tangents[i - 1] / 3}`;
    const control2 = `${(i - 1 / 3) * step} ${ys[i] - tangents[i] / 3}`;
    path += ` C${control1} ${control2} ${i * step} ${ys[i]}`;
  }
  return path;
}

export function Sparkline({ points, change, height }: { points: number[]; change?: number; height?: number }) {
  const gradientId = useId();
  const expanded = change !== undefined;
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const w = expanded ? 240 : 64;
  const h = height ?? (expanded ? 32 : 24);
  const step = w / (points.length - 1);
  const path = monotonePath(points.map(p => h - 2 - ((p - min) / span) * (h - 5)), step);
  const up = change === undefined ? points[points.length - 1] >= points[0] : change >= 0;
  const color = up ? "#34D399" : "#F87171";
  return (
    <svg
      width={expanded ? "100%" : w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={expanded ? "my-2 block" : "shrink-0"}
      aria-hidden="true"
    >
      {expanded && (
        <>
          <defs>
            <linearGradient id={gradientId} x2="0" y2="1">
              <stop stopColor={color} stopOpacity={height ? 0.2 : 0.18} />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${path} L${w} ${h} L0 ${h} Z`} fill={`url(#${gradientId})`} />
        </>
      )}
      <path
        vectorEffect="non-scaling-stroke"
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MaValue({
  label,
  value,
  price,
  lang = "en",
}: {
  label: string;
  value: number | null;
  price: number;
  lang?: Lang;
}) {
  const t = dict[lang].markets;
  if (value === null) {
    return <span className="text-slate-600">{label} —</span>;
  }
  const cls = price >= value ? "text-emerald-400" : "text-rose-400";
  return (
    <span className="text-slate-600" title={price >= value ? t.above(label) : t.below(label)}>
      {label} <AnimatedNumber value={value} digits={2} group className={cls} />
    </span>
  );
}

export function RsiValue({ value, lang = "en" }: { value: number | null; lang?: Lang }) {
  const t = dict[lang].markets;
  if (value === null) {
    return <span className="text-slate-600">RSI14 —</span>;
  }
  const cls =
    value >= 70 ? "text-rose-400" : value <= 30 ? "text-emerald-400" : "text-slate-400";
  const note = value >= 70 ? t.rsiOverbought : value <= 30 ? t.rsiOversold : t.rsiNeutral;
  return (
    <span className="text-slate-600" title={`RSI(14) ${note}`}>
      RSI14{" "}
      <AnimatedNumber value={value} digits={1} className={cls} />
    </span>
  );
}

export function MacdValue({ tech, lang = "en" }: { tech: Technicals; lang?: Lang }) {
  const t = dict[lang].markets;
  if (tech.macd === null) {
    return <span className="text-slate-600">MACD —</span>;
  }
  const bullish = tech.macd >= (tech.macdSignal ?? 0);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-slate-600" title={t.macdTip}>
        MACD{" "}
        <AnimatedNumber
          value={tech.macd}
          digits={2}
          className={bullish ? "text-emerald-400" : "text-rose-400"}
        />
      </span>
      {tech.macdCross && (
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] ${
            tech.macdCross === "golden"
              ? "bg-emerald-400/10 text-emerald-400"
              : "bg-rose-400/10 text-rose-400"
          }`}
        >
          {tech.macdCross === "golden" ? t.goldenCross : t.deathCross}
        </span>
      )}
    </span>
  );
}
