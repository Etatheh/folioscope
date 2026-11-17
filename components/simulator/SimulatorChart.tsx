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
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toFixed(0);
}

/**
 * The original Investment Simulator chart, restored from the pre-merge
 * PortfolioSimulator component.
 *
 * Visual contract:
 * - emerald 2px portfolio line (subtle glow, same geometry)
 * - slate 1.4px dashed comparison line
 * - 720×240 viewBox, five grid lines, MM-DD x-axis labels
 * - pointer/touch crosshair, endpoint dot and the date/value readout
 *
 * The caller supplies the data pairs:
 * - Lump Sum: portfolio % vs S&P 500 %
 * - DCA: portfolio value ($) vs cumulative invested ($)
 */
export default function SimulatorChart({
  labels,
  primary,
  secondary,
  mode,
  legendPrimary,
  legendSecondary,
  ariaLabel,
}: {
  labels: string[];
  primary: number[];
  secondary: number[];
  mode: "percent" | "value";
  legendPrimary: string;
  legendSecondary: string;
  ariaLabel: string;
}) {
  const uid = useId().replace(/[:]/g, "");
  const glowId = `sim-legacy-glow-${uid}`;
  const [hover, setHover] = useState<number | null>(null);

  const chart = useMemo(() => {
    const n = labels.length;
    if (n < 2) return null;

    const values = [...primary, ...secondary].filter((value) =>
      Number.isFinite(value)
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
    const line = (series: number[]) => {
      let d = "";
      series.forEach((value, i) => {
        if (!Number.isFinite(value)) return;
        d += `${d ? "L" : "M"}${x(i).toFixed(1)} ${y(value).toFixed(1)}`;
      });
      return d;
    };

    return {
      n,
      x,
      y,
      primaryPath: line(primary),
      secondaryPath: line(secondary),
      grid: [0, 1, 2, 3, 4].map((i) => min + ((max - min) * i) / 4),
      labelEvery: Math.max(1, Math.ceil(n / 6)),
    };
  }, [labels.length, mode, primary, secondary]);

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
  const hoverText = useMemo(() => {
    if (hover === null) return "";
    const date = labels[hover] ?? "";
    if (mode === "percent") {
      const parts = [date];
      if (Number.isFinite(hoveredPrimary)) {
        parts.push(`${legendPrimary} ${fmtSigned((hoveredPrimary as number) - 100)}%`);
      }
      if (Number.isFinite(hoveredSecondary)) {
        parts.push(
          `${legendSecondary} ${fmtSigned((hoveredSecondary as number) - 100)}%`
        );
      }
      return parts.join(" · ");
    }

    const parts = [date];
    if (Number.isFinite(hoveredPrimary)) {
      parts.push(`${legendPrimary} $${fmtMoney(hoveredPrimary as number)}`);
    }
    if (Number.isFinite(hoveredSecondary)) {
      parts.push(`${legendSecondary} $${fmtMoney(hoveredSecondary as number)}`);
    }
    if (
      Number.isFinite(hoveredPrimary) &&
      Number.isFinite(hoveredSecondary) &&
      (hoveredSecondary as number) > 0
    ) {
      parts.push(
        `${fmtSigned(
          ((hoveredPrimary as number) / (hoveredSecondary as number) - 1) * 100
        )}%`
      );
    }
    return parts.join(" · ");
  }, [
    hover,
    labels,
    mode,
    legendPrimary,
    legendSecondary,
    hoveredPrimary,
    hoveredSecondary,
  ]);

  return (
    <div className="relative min-w-0">
      <div className="flex flex-wrap items-center justify-end gap-3 text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded bg-emerald-400" />
          {legendPrimary}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded bg-slate-400" />
          {legendSecondary}
        </span>
      </div>

      <div className="min-h-4 text-right text-[11px] tabular-nums text-slate-500">
        {hoverText}
      </div>

      {chart && (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full select-none"
          style={{ touchAction: "pan-y" }}
          onPointerMove={setHoverFromPointer}
          onPointerDown={setHoverFromPointer}
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