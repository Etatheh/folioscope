"use client";

import { useId, useMemo, useState, type PointerEvent } from "react";

import { fmtMoney } from "@/components/dca/engine";
import { fmtSigned } from "@/components/market-ui";

const W = 720;
const H = 240;
const PL = 8;
const PR = 56;
const PT = 12;
const PB = 22;
const PLOT_W = W - PL - PR;
const PLOT_H = H - PT - PB;

function axisLabel(value: number, mode: "percent" | "value") {
  if (mode === "percent") return value.toFixed(0);
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return `${sign}$${abs.toFixed(0)}`;
}

function pnlLabel(value: number) {
  return `${value >= 0 ? "+" : "-"}$${fmtMoney(Math.abs(value))}`;
}

/**
 * The original Investment Simulator chart, restored from the pre-merge
 * PortfolioSimulator component.
 *
 * Visual contract:
 * - emerald 2px portfolio line (subtle glow, same geometry)
 * - slate 1.4px dashed S&P 500 comparison line
 * - optional light-violet stepped principal line for DCA
 * - 720×240 viewBox, five grid lines, MM-DD x-axis labels
 * - pointer/touch crosshair, endpoint dot and the date/value readout
 */
export default function SimulatorChart({
  labels,
  primary,
  secondary,
  tertiary,
  mode,
  legendPrimary,
  legendSecondary,
  legendTertiary,
  ariaLabel,
}: {
  labels: string[];
  primary: number[];
  secondary: number[];
  tertiary?: number[];
  mode: "percent" | "value";
  legendPrimary: string;
  legendSecondary: string;
  legendTertiary?: string;
  ariaLabel: string;
}) {
  const uid = useId().replace(/[:]/g, "");
  const glowId = `sim-legacy-glow-${uid}`;
  const [hover, setHover] = useState<number | null>(null);

  const chart = useMemo(() => {
    const n = labels.length;
    if (n < 2) return null;

    const values = [...primary, ...secondary, ...(tertiary ?? [])].filter(
      (value) => Number.isFinite(value)
    );
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      min = 90;
      max = 110;
    }
    const pad = (max - min) * 0.08 || 1;
    min -= pad;
    max += pad;
    // Portfolio / invested dollars never go below zero; keep the baseline clean.
    if (mode === "value" && min < 0) min = 0;

    const x = (i: number) => PL + (i / Math.max(1, n - 1)) * PLOT_W;
    const y = (value: number) =>
      PT + ((max - value) / Math.max(1, max - min)) * PLOT_H;
    const line = (series: readonly number[]) => {
      let d = "";
      series.forEach((value, i) => {
        if (!Number.isFinite(value)) return;
        d += `${d ? "L" : "M"}${x(i).toFixed(1)} ${y(value).toFixed(1)}`;
      });
      return d;
    };
    const stepLine = (series: readonly number[]) => {
      let d = "";
      let previousY: number | null = null;
      series.forEach((value, i) => {
        if (!Number.isFinite(value)) return;
        const px = x(i).toFixed(1);
        const py = y(value).toFixed(1);
        if (!d) d = `M${px} ${py}`;
        else if (previousY !== null) d += `H${px}V${py}`;
        previousY = Number(py);
      });
      return d;
    };

    return {
      n,
      x,
      y,
      primaryPath: line(primary),
      secondaryPath: line(secondary),
      tertiaryPath: tertiary ? stepLine(tertiary) : "",
      grid: [0, 1, 2, 3, 4].map((i) => min + ((max - min) * i) / 4),
      labelEvery: Math.max(1, Math.ceil(n / 6)),
    };
  }, [labels.length, mode, primary, secondary, tertiary]);

  const setHoverFromPointer = (event: PointerEvent<SVGSVGElement>) => {
    if (!chart) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const px = ((event.clientX - rect.left) / rect.width) * W;
    setHover(
      Math.min(
        chart.n - 1,
        Math.max(0, Math.round(((px - PL) / PLOT_W) * (chart.n - 1)))
      )
    );
  };

  const hoveredPrimary = hover !== null ? primary[hover] : null;
  const hoveredSecondary = hover !== null ? secondary[hover] : null;
  const hoveredTertiary = hover !== null && tertiary ? tertiary[hover] : null;

  const hoverReadout = useMemo(() => {
    if (hover === null) return null;
    const primaryValue = Number.isFinite(hoveredPrimary)
      ? (hoveredPrimary as number)
      : null;
    const secondaryValue = Number.isFinite(hoveredSecondary)
      ? (hoveredSecondary as number)
      : null;
    const tertiaryValue = Number.isFinite(hoveredTertiary)
      ? (hoveredTertiary as number)
      : null;
    const alpha =
      primaryValue !== null &&
      secondaryValue !== null &&
      secondaryValue > 0
        ? (primaryValue / secondaryValue - 1) * 100
        : null;
    const pnl =
      primaryValue !== null && tertiaryValue !== null
        ? primaryValue - tertiaryValue
        : null;
    const pnlPct =
      primaryValue !== null &&
      tertiaryValue !== null &&
      tertiaryValue > 0
        ? (primaryValue / tertiaryValue - 1) * 100
        : null;
    return {
      date: labels[hover] ?? "",
      primary: primaryValue,
      secondary: secondaryValue,
      tertiary: tertiaryValue,
      alpha,
      pnl,
      pnlPct,
    };
  }, [hover, labels, hoveredPrimary, hoveredSecondary, hoveredTertiary]);

  return (
    <div className="relative min-w-0">
      <div className="flex flex-wrap items-center justify-end gap-3 text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded bg-emerald-400" />
          {legendPrimary}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 border-t border-dashed border-slate-400/70" />
          {legendSecondary}
        </span>
        {tertiary && legendTertiary && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 border-t border-dashed border-[#c4b5fd]/80" />
            {legendTertiary}
          </span>
        )}
      </div>

      <div className="min-h-5 text-right text-[11px] tabular-nums text-slate-500">
        {hoverReadout ? (
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
            <span className="text-slate-500">{hoverReadout.date}</span>
            {hoverReadout.primary !== null && (
              <span>
                {legendPrimary}{" "}
                <span className="font-medium text-emerald-400">
                  ${fmtMoney(hoverReadout.primary)}
                </span>
              </span>
            )}
            {hoverReadout.secondary !== null && (
              <span>
                {legendSecondary}{" "}
                <span className="font-medium text-slate-200">
                  ${fmtMoney(hoverReadout.secondary)}
                </span>
              </span>
            )}
            {hoverReadout.tertiary !== null && legendTertiary && (
              <span>
                {legendTertiary}{" "}
                <span className="font-medium text-[#c4b5fd]">
                  ${fmtMoney(hoverReadout.tertiary)}
                </span>
              </span>
            )}
            {hoverReadout.pnl !== null && (
              <span>
                P/L{" "}
                <span
                  className={
                    hoverReadout.pnl >= 0
                      ? "font-medium text-emerald-400"
                      : "font-medium text-rose-400"
                  }
                >
                  {pnlLabel(hoverReadout.pnl)}
                  {hoverReadout.pnlPct !== null
                    ? ` (${fmtSigned(hoverReadout.pnlPct)}%)`
                    : ""}
                </span>
              </span>
            )}
            {hoverReadout.alpha !== null && (
              <span>
                Alpha{" "}
                <span
                  className={
                    hoverReadout.alpha >= 0
                      ? "font-medium text-emerald-400"
                      : "font-medium text-rose-400"
                  }
                >
                  {fmtSigned(hoverReadout.alpha)}%
                </span>
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-600">
            Hover or drag the curve to inspect daily values
          </span>
        )}
      </div>

      {chart && (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full select-none"
          style={{ touchAction: "pan-y" }}
          onPointerMove={setHoverFromPointer}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setHoverFromPointer(event);
          }}
          onPointerLeave={() => setHover(null)}
          onPointerCancel={() => setHover(null)}
          role="img"
          aria-label={ariaLabel}
        >
          <defs>
            <filter id={glowId} x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {chart.grid.map((value) => (
            <g key={value}>
              <line
                x1={PL}
                x2={W - PR}
                y1={chart.y(value)}
                y2={chart.y(value)}
                stroke="rgba(148,163,184,0.10)"
              />
              <text
                x={W - PR + 6}
                y={chart.y(value) + 3.5}
                fontSize="10"
                fill="#64748b"
              >
                {axisLabel(value, mode)}
              </text>
            </g>
          ))}

          <path
            d={chart.secondaryPath}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.4"
            strokeDasharray="5 4"
            opacity="0.7"
          />
          {tertiary && (
            <path
              d={chart.tertiaryPath}
              fill="none"
              stroke="#c4b5fd"
              strokeWidth="1.4"
              strokeDasharray="3 4"
              opacity="0.85"
            />
          )}
          <path
            d={chart.primaryPath}
            fill="none"
            stroke="#34d399"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter={`url(#${glowId})`}
          />

          {hover !== null &&
            Number.isFinite(hoveredPrimary) && (
              <g>
                <line
                  x1={PL}
                  x2={W - PR}
                  y1={chart.y(hoveredPrimary as number)}
                  y2={chart.y(hoveredPrimary as number)}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.35"
                />
                <line
                  x1={chart.x(hover)}
                  x2={chart.x(hover)}
                  y1={12}
                  y2={H - 22}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.6"
                />
                <circle
                  cx={chart.x(hover)}
                  cy={chart.y(hoveredPrimary as number)}
                  r="3.5"
                  fill="#34d399"
                  stroke="#030712"
                  strokeWidth="1.5"
                />
                <g pointerEvents="none">
                  <rect
                    x={W - PR + 2}
                    y={Math.min(
                      Math.max(chart.y(hoveredPrimary as number) - 8, PT),
                      PT + PLOT_H - 16
                    )}
                    width={PR - 4}
                    height={16}
                    rx={3}
                    fill="#111827"
                    stroke="#34d399"
                    strokeOpacity="0.6"
                  />
                  <text
                    x={W - PR + 2 + (PR - 4) / 2}
                    y={Math.min(
                      Math.max(chart.y(hoveredPrimary as number) - 8, PT),
                      PT + PLOT_H - 16
                    ) + 11.5}
                    textAnchor="middle"
                    fontSize="9.5"
                    fill="#e2e8f0"
                  >
                    {axisLabel(hoveredPrimary as number, mode)}
                  </text>
                  <rect
                    x={Math.min(
                      Math.max(chart.x(hover) - 28, PL),
                      W - PR - 56
                    )}
                    y={H - 17}
                    width={56}
                    height={14}
                    rx={3}
                    fill="#111827"
                    stroke="#475569"
                    strokeOpacity="0.7"
                  />
                  <text
                    x={
                      Math.min(Math.max(chart.x(hover) - 28, PL), W - PR - 56) +
                      28
                    }
                    y={H - 6.5}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#e2e8f0"
                  >
                    {(labels[hover] ?? "").slice(5)}
                  </text>
                </g>
              </g>
            )}

          {labels.map((date, index) =>
            index % chart.labelEvery === 0 || index === labels.length - 1 ? (
              <text
                key={`${date}-${index}`}
                x={chart.x(index)}
                y={H - 4}
                fontSize="10"
                fill="#64748b"
                textAnchor={
                  index === 0
                    ? "start"
                    : index === labels.length - 1
                      ? "end"
                      : "middle"
                }
              >
                {date.slice(5)}
              </text>
            ) : null
          )}
        </svg>
      )}
    </div>
  );
}