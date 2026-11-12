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

export const fmtHands = (v: number) =>
  v >= 1e8 ? `${(v / 1e8).toFixed(2)}亿手` : v >= 1e4 ? `${(v / 1e4).toFixed(2)}万手` : `${v}手`;

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

export function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const w = 64;
  const h = 24;
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = (i * step).toFixed(2);
      const y = (h - 2 - ((p - min) / span) * (h - 5)).toFixed(2);
      return `${i === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");
  const up = points[points.length - 1] >= points[0];
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0"
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke={up ? "#34d399" : "#fb7185"}
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
  lang = "zh",
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

export function RsiValue({ value, lang = "zh" }: { value: number | null; lang?: Lang }) {
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

export function MacdValue({ tech, lang = "zh" }: { tech: Technicals; lang?: Lang }) {
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

export function ValuationChip({
  percentile,
  lang = "zh",
}: {
  percentile: number | null;
  lang?: Lang;
}) {
  const t = dict[lang].markets;
  if (percentile === null) return null;
  const cls =
    percentile < 0.3
      ? "bg-emerald-400/10 text-emerald-400"
      : percentile < 0.7
        ? "bg-sky-400/10 text-sky-400"
        : "bg-rose-400/10 text-rose-400";
  const label = percentile < 0.3 ? t.cheap : percentile < 0.7 ? t.fair : t.rich;
  return <span className={`rounded-full px-2 py-0.5 text-[10px] ${cls}`}>{label}</span>;
}
