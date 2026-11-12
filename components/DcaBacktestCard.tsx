"use client";

import { useId, useMemo, useState } from "react";

import { dict, type Lang } from "@/lib/i18n";
import type { ViewerPlan } from "@/lib/access";
import type { DcaSeries } from "@/lib/dca";
import ProBadge from "./ui/ProBadge";
import ProUpgradeButton from "./ui/ProUpgradeButton";

const MIN_MONTHLY = 100;
const MAX_MONTHLY = 2000;
const STEP = 50;

const fmtMoney = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 0 });

const fmtPct = (value: number) =>
  `${value >= 0 ? "+" : "-"}${Math.abs(value * 100).toFixed(1)}%`;

function computeDca(points: DcaSeries["points"], monthly: number) {
  let units = 0;
  let invested = 0;
  const curve = points.map((point) => {
    units += monthly / point.close;
    invested += monthly;
    return { month: point.month, value: units * point.close, invested };
  });

  const finalValue = curve.at(-1)?.value ?? 0;
  const totalReturn = invested > 0 ? finalValue / invested - 1 : 0;
  const years = points.length / 12;
  const cagr =
    invested > 0 && years > 0 && finalValue > 0
      ? Math.pow(finalValue / invested, 1 / years) - 1
      : 0;

  return { curve, invested, finalValue, totalReturn, cagr, months: points.length };
}

/**
 * Pro-gated 5-year monthly DCA backtest on the S&P 500.
 * Free and anonymous visitors get the same card with a blurred curve and the
 * upgrade dialog one click away.
 */
export default function DcaBacktestCard({
  lang,
  plan,
  series,
}: {
  lang: Lang;
  plan: ViewerPlan;
  series: DcaSeries;
}) {
  const t = dict[lang].dca;
  const isPro = plan === "pro";
  const [monthly, setMonthly] = useState(500);
  const gradientId = useId();

  const stats = useMemo(() => computeDca(series.points, monthly), [series.points, monthly]);

  const chart = useMemo(() => {
    const width = 640;
    const height = 210;
    const padLeft = 4;
    const padRight = 58;
    const padTop = 16;
    const padBottom = 24;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;
    const count = stats.curve.length;
    const max = Math.max(stats.finalValue, stats.invested, 1);
    const min = 0;

    const x = (index: number) =>
      padLeft + (index / Math.max(1, count - 1)) * plotWidth;
    const y = (value: number) =>
      padTop + ((max - value) / Math.max(1, max - min)) * plotHeight;

    const line = stats.curve
      .map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)} ${y(point.value).toFixed(1)}`)
      .join(" ");
    const area = `${line} L${x(count - 1).toFixed(1)} ${(height - padBottom).toFixed(1)} L${padLeft} ${(height - padBottom).toFixed(1)} Z`;
    const investedLine = `M${x(0).toFixed(1)} ${y(monthly).toFixed(1)} L${x(count - 1).toFixed(1)} ${y(stats.invested).toFixed(1)}`;

    const ticks = [0, 1, 2, 3].map((step) => min + ((max - min) * step) / 3);
    const monthLabels = [0, Math.floor((count - 1) / 2), count - 1].map((index) => ({
      index,
      label: stats.curve[index]?.month.slice(2).replace("-", "/") ?? "",
    }));

    return { width, height, padLeft, padRight, padTop, padBottom, plotWidth, plotHeight, count, x, y, line, area, investedLine, ticks, monthLabels };
  }, [stats, monthly]);

  const statsBlocks = [
    { label: t.invested, value: `$${fmtMoney(stats.invested)}`, tone: "text-slate-200" },
    { label: t.finalValue, value: `$${fmtMoney(stats.finalValue)}`, tone: "text-white" },
    { label: t.totalReturn, value: fmtPct(stats.totalReturn), tone: stats.totalReturn >= 0 ? "text-emerald-400" : "text-rose-400" },
    { label: t.cagr, value: fmtPct(stats.cagr), tone: stats.cagr >= 0 ? "text-emerald-400" : "text-rose-400" },
  ];

  return (
    <article className="data-card flex h-full flex-col rounded-2xl p-5 sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">
            {t.title}
            <span className="ml-2 align-middle text-xs font-normal text-slate-500">
              {t.subtitle}
            </span>
          </h2>
          <p className="mt-1 flex items-center gap-2 text-[11px] text-slate-600">
            <span>
              {series.name} · {stats.months} {t.months}
            </span>
            {series.demo && (
              <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-300">
                {t.demo}
              </span>
            )}
          </p>
        </div>
        <ProBadge title={dict[lang].pro.badgeTip} />
      </header>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex w-full max-w-xs items-center gap-3 text-[11px] text-slate-500">
          <span className="whitespace-nowrap">{t.monthly}</span>
          <input
            type="range"
            min={MIN_MONTHLY}
            max={MAX_MONTHLY}
            step={STEP}
            value={monthly}
            disabled={!isPro}
            onChange={(event) => setMonthly(Number(event.target.value))}
            className="h-1 flex-1 cursor-pointer accent-purple-500 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t.monthly}
          />
          <span className="w-14 shrink-0 text-right text-xs font-medium tabular-nums text-slate-200">
            ${monthly}
          </span>
        </label>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {statsBlocks.map((block) => (
          <div
            key={block.label}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
          >
            <p className="text-[11px] text-slate-600">{block.label}</p>
            <p
              className={`mt-1 text-base font-semibold tabular-nums ${block.tone} ${
                isPro ? "" : "blur-[5px] select-none"
              }`}
              aria-hidden={!isPro}
            >
              {block.value}
            </p>
          </div>
        ))}
      </div>

      <div className="relative mt-3 flex-1">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          className={`w-full select-none transition-opacity duration-300 ${
            isPro ? "" : "opacity-45"
          }`}
          role="img"
          aria-label={`${t.title} · ${series.name}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {chart.ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={chart.padLeft}
                x2={chart.width - chart.padRight}
                y1={chart.y(tick)}
                y2={chart.y(tick)}
                stroke="rgba(148,163,184,0.10)"
              />
              <text
                x={chart.width - chart.padRight + 6}
                y={chart.y(tick) + 3.5}
                fontSize="10"
                fill="#64748b"
              >
                {fmtMoney(tick)}
              </text>
            </g>
          ))}

          <path d={chart.area} fill={`url(#${gradientId})`} />
          <path
            d={chart.investedLine}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.3"
            strokeDasharray="5 4"
            opacity="0.65"
          />
          <path
            d={chart.line}
            fill="none"
            stroke="#a78bfa"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {chart.monthLabels.map((tick) => (
            <text
              key={tick.index}
              x={chart.x(tick.index)}
              y={chart.height - 6}
              fontSize="10"
              fill="#64748b"
              textAnchor={tick.index === 0 ? "start" : tick.index === chart.count - 1 ? "end" : "middle"}
            >
              {tick.label}
            </text>
          ))}
        </svg>

        {!isPro && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-t from-[#070b13]/85 via-[#070b13]/45 to-transparent p-4 text-center">
            <span className="text-lg" aria-hidden>
              🔒
            </span>
            <p className="max-w-xs text-xs leading-relaxed text-slate-300">{t.locked}</p>
            <ProUpgradeButton
              lang={lang}
              variant="secondary"
              label={dict[lang].pro.upgrade}
              source="dca-backtest"
              className="mt-1"
            />
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-600">{t.disclaimer}</p>
    </article>
  );
}
