"use client";

import { useId, useMemo, useState, type PointerEvent } from "react";
import { dict, type Lang } from "@/lib/i18n";
import {
  SAMPLES,
  fmtMoney,
  fmtMonthShort,
  sampleAt,
  type DcaCurvePoint,
  type Samples,
} from "./engine";

const W = 640;
const H = 230;
const PAD_L = 4;
const PAD_R = 58;
const PAD_T = 16;
const PAD_B = 26;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

/** Evenly spaced axis label indices, denser for short periods. */
function labelIndices(count: number): number[] {
  if (count <= 1) return [0];
  const target = count <= 12 ? Math.min(count, 6) : 5;
  return Array.from({ length: target }, (_, k) =>
    Math.round((k * (count - 1)) / (target - 1)),
  );
}

export default function DcaChart({
  lang,
  anim,
  curve,
  altCurve,
  legendDca,
  benchmarkLabel,
  dimmed = false,
}: {
  lang: Lang;
  /** Morphing (animated) resampled series. */
  anim: Samples;
  /** Real target curve, used for axis labels + tooltip readouts. */
  curve: DcaCurvePoint[];
  /** Comparison index curve (same monthly, same window). */
  altCurve: DcaCurvePoint[];
  legendDca: string;
  benchmarkLabel: string;
  dimmed?: boolean;
}) {
  const t = dict[lang].dca;
  const uid = useId().replace(/[:]/g, "");
  const areaId = `dca-area-${uid}`;
  const glowId = `dca-glow-${uid}`;
  const flowId = `dca-flow-${uid}`;
  const crossId = `dca-cross-${uid}`;
  const [hoverT, setHoverT] = useState<number | null>(null);

  const x = (i: number) => PAD_L + (i / (SAMPLES - 1)) * PLOT_W;
  const y = (v: number) => PAD_T + ((anim.max - v) / Math.max(1, anim.max)) * PLOT_H;

  const paths = useMemo(() => {
    const line = anim.values
      .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
      .join(" ");
    const baseY = (H - PAD_B).toFixed(1);
    const area = `${line} L${x(SAMPLES - 1).toFixed(1)} ${baseY} L${PAD_L} ${baseY} Z`;
    const invested = anim.invested
      .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
      .join(" ");
    const lump = anim.lump
      .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
      .join(" ");
    return { line, area, invested, lump };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim]);

  const ticks = [0, 1, 2, 3].map((s) => (anim.max * s) / 3);
  const labels = labelIndices(curve.length).map((idx) => ({
    idx,
    label: fmtMonthShort(curve[idx]?.month ?? ""),
    x: PAD_L + (idx / Math.max(1, curve.length - 1)) * PLOT_W,
  }));

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    setHoverT(Math.min(1, Math.max(0, (px - PAD_L) / PLOT_W)));
  };

  const hover = useMemo(() => {
    if (hoverT === null || curve.length === 0) return null;
    const idx = Math.round(hoverT * (curve.length - 1));
    const point = curve[idx];
    if (!point) return null;
    return {
      idx,
      point,
      x: PAD_L + hoverT * PLOT_W,
      valueY: y(sampleAt(anim.values, hoverT)),
      investedY: y(sampleAt(anim.invested, hoverT)),
      lumpY: y(sampleAt(anim.lump, hoverT)),
      profit: point.value - point.invested,
      altValue: altCurve[idx]?.value ?? 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverT, curve, altCurve, anim]);

  const endX = x(SAMPLES - 1);
  const endY = y(anim.values[SAMPLES - 1] ?? 0);

  return (
    <div className="relative">
      <div className="mb-1 flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-[#a78bfa]" />
          {legendDca}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-[#94a3b8]" />
          {t.legend.principal}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-[#fbbf24]" />
          {benchmarkLabel}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={`w-full select-none transition-opacity duration-300 ${dimmed ? "opacity-45" : ""}`}
        role="img"
        aria-label={t.title}
        onPointerMove={onMove}
        onPointerLeave={() => setHoverT(null)}
      >
        <defs>
          <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(168,85,247,0.35)" />
            <stop offset="100%" stopColor="rgba(168,85,247,0.0)" />
          </linearGradient>
          <linearGradient id={flowId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.9)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <linearGradient id={crossId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(167,139,250,0)" />
            <stop offset="50%" stopColor="rgba(167,139,250,0.7)" />
            <stop offset="100%" stopColor="rgba(167,139,250,0)" />
          </linearGradient>
          <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.5" result="b1" />
            <feGaussianBlur stdDeviation="8" result="b2" />
            <feMerge>
              <feMergeNode in="b2" />
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {ticks.map((tick, i) => (
          <g key={i}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={y(tick)}
              y2={y(tick)}
              stroke="rgba(148,163,184,0.10)"
            />
            <text x={W - PAD_R + 6} y={y(tick) + 3.5} fontSize="10" fill="#64748b">
              {fmtMoney(tick)}
            </text>
          </g>
        ))}

        <path d={paths.area} fill={`url(#${areaId})`} />
        <path
          d={paths.invested}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.3"
          strokeDasharray="5 4"
          opacity="0.65"
        />
        <path
          d={paths.lump}
          fill="none"
          stroke="#fbbf24"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d={paths.line}
          fill="none"
          stroke="#a78bfa"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          filter={`url(#${glowId})`}
        />
        {/* moving gleam riding on top of the main curve */}
        <path
          d={paths.line}
          fill="none"
          stroke={`url(#${flowId})`}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="70 650"
          className="dca-flow"
          opacity="0.85"
        />

        {/* endpoint breathing pulse */}
        <circle cx={endX} cy={endY} r="5" fill="rgba(168,85,247,0.5)" className="dca-pulse" />
        <circle cx={endX} cy={endY} r="3.4" fill="#c084fc" stroke="#fde68a" strokeWidth="1" />

        {hover && (
          <g>
            <line
              x1={hover.x}
              x2={hover.x}
              y1={PAD_T}
              y2={H - PAD_B}
              stroke={`url(#${crossId})`}
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
            <circle cx={hover.x} cy={hover.investedY} r="3" fill="#e2e8f0" />
            <circle cx={hover.x} cy={hover.lumpY} r="3" fill="#fbbf24" />
            <circle
              cx={hover.x}
              cy={hover.valueY}
              r="4"
              fill="#a78bfa"
              stroke="#030712"
              strokeWidth="1.4"
              filter={`url(#${glowId})`}
            />
          </g>
        )}

        {labels.map((l) => (
          <text
            key={l.idx}
            x={l.x}
            y={H - 6}
            fontSize="10"
            fill="#64748b"
            textAnchor={l.idx === 0 ? "start" : l.idx === curve.length - 1 ? "end" : "middle"}
          >
            {l.label}
          </text>
        ))}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 rounded-xl border border-purple-400/25 bg-[#12081f]/70 px-3 py-2 text-[11px] shadow-xl shadow-purple-500/10 backdrop-blur-[12px]"
          style={{
            left: `${Math.min(88, Math.max(12, (hover.x / W) * 100))}%`,
            top: `${Math.max(4, (hover.valueY / H) * 100 - 8)}%`,
          }}
        >
          <p className="font-semibold tabular-nums text-white">{hover.point.month.replace("-", "/")}</p>
          <dl className="mt-1 space-y-0.5 tabular-nums">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">{t.tip.invested}</dt>
              <dd className="text-slate-300">${fmtMoney(hover.point.invested)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">{t.tip.value}</dt>
              <dd className="text-white">${fmtMoney(hover.point.value)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">{t.tip.profit}</dt>
              <dd className={hover.profit >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {hover.profit >= 0 ? "+" : "-"}${fmtMoney(Math.abs(hover.profit))}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">{benchmarkLabel}</dt>
              <dd className="text-amber-300">${fmtMoney(hover.altValue)}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
