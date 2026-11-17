"use client";

import { useState, type MouseEvent } from "react";
import type { ChartSeries } from "@/lib/us-stocks";
import { dict, type Lang } from "@/lib/i18n";

const W = 760;
const H_PRICE = 300;
const H_VOL = 64;
const GAP = 10;
const PAD_L = 10;
const PAD_R = 54;
const PAD_T = 8;
const LABEL_H = 18;
const H_TOTAL = PAD_T + H_PRICE + GAP + H_VOL + LABEL_H;

const MA_CONFIG = [
  { key: "ma5" as const, label: "MA5", color: "#60a5fa" },
  { key: "ma10" as const, label: "MA10", color: "#a78bfa" },
  { key: "ma20" as const, label: "MA20", color: "#fbbf24" },
];

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PriceChart({
  series,
  lang = "zh",
}: {
  series: ChartSeries;
  lang?: Lang;
}) {
  const tx = dict[lang].detail;
  const { bars, ma5, ma10, ma20 } = series;
  const [hover, setHover] = useState<number | null>(null);

  const n = Math.max(bars.length, 1);
  const plotW = W - PAD_L - PAD_R;
  const slot = plotW / n;
  const x = (i: number) => PAD_L + slot * (i + 0.5);

  let min = Infinity;
  let max = -Infinity;
  let maxVol = 0;
  for (const bar of bars) {
    if (bar.low < min) min = bar.low;
    if (bar.high > max) max = bar.high;
    if (bar.volume > maxVol) maxVol = bar.volume;
  }
  for (const arr of [ma5, ma10, ma20]) {
    for (const v of arr) {
      if (v === null) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  const pad = (max - min) * 0.05 || 1;
  min -= pad;
  max += pad;

  const priceY = (p: number) => PAD_T + ((max - p) / (max - min)) * (H_PRICE - PAD_T);
  const volTop = PAD_T + H_PRICE + GAP;
  const volBottom = volTop + H_VOL;
  const volY = (v: number) => volBottom - (v / (maxVol || 1)) * H_VOL;

  const gridLevels = [0, 1, 2, 3, 4].map((i) => min + ((max - min) * i) / 4);
  const maPath = (values: (number | null)[]) => {
    let d = "";
    values.forEach((v, i) => {
      if (v === null) return;
      d += `${d ? "L" : "M"}${x(i).toFixed(1)} ${priceY(v).toFixed(1)}`;
    });
    return d;
  };

  const labelEvery = Math.max(1, Math.ceil(n / 6));

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.min(n - 1, Math.max(0, Math.round((px - PAD_L) / slot - 0.5)));
    setHover(idx);
  };

  const t = hover !== null ? bars[hover] : null;
  const prev = hover !== null && hover > 0 ? bars[hover - 1].close : null;
  const pct = t && prev ? ((t.close - prev) / prev) * 100 : null;

  return (
    <div className="relative">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-3 text-slate-500">
          {MA_CONFIG.map(({ label, color }) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
        <span className="tabular-nums text-slate-500">
          {t
            ? `${t.date} · ${tx.openC} ${fmt(t.open)} ${tx.highC} ${fmt(t.high)} ${tx.lowC} ${fmt(t.low)} ${tx.closeC} ${fmt(t.close)}${
                pct !== null ? ` (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)` : ""
              }`
            : tx.hoverHint}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H_TOTAL}`}
        className="w-full select-none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={lang === "zh" ? "日K线图" : "Daily candlestick chart"}
      >
        {gridLevels.map((p) => (
          <g key={p}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={priceY(p)}
              y2={priceY(p)}
              stroke="rgba(148,163,184,0.10)"
            />
            <text x={W - PAD_R + 6} y={priceY(p) + 3.5} fontSize="10" fill="#64748b">
              {fmt(p)}
            </text>
          </g>
        ))}
        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={volBottom}
          y2={volBottom}
          stroke="rgba(148,163,184,0.10)"
        />
        {bars.map((bar, i) => {
          const up = bar.close >= bar.open;
          const bw = Math.max(2, Math.min(slot * 0.55, 14));
          const top = volY(bar.volume);
          return (
            <rect
              key={`v${i}`}
              x={x(i) - bw / 2}
              y={top}
              width={bw}
              height={Math.max(1, volBottom - top)}
              fill={up ? "#34d399" : "#fb7185"}
              opacity="0.3"
            />
          );
        })}
        {bars.map((bar, i) => {
          const up = bar.close >= bar.open;
          const bw = Math.max(2, Math.min(slot * 0.55, 14));
          const yHigh = priceY(bar.high);
          const yLow = priceY(bar.low);
          const yOpen = priceY(bar.open);
          const yClose = priceY(bar.close);
          const bodyTop = Math.min(yOpen, yClose);
          const bodyH = Math.max(1.5, Math.abs(yOpen - yClose));
          const color = up ? "#34d399" : "#fb7185";
          return (
            <g key={`c${i}`}>
              <line x1={x(i)} x2={x(i)} y1={yHigh} y2={yLow} stroke={color} strokeWidth="1" />
              <rect x={x(i) - bw / 2} y={bodyTop} width={bw} height={bodyH} fill={color} />
            </g>
          );
        })}
        {MA_CONFIG.map(({ key, color }) => (
          <path
            key={key}
            d={maPath(key === "ma5" ? ma5 : key === "ma10" ? ma10 : ma20)}
            fill="none"
            stroke={color}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        ))}
        {hover !== null && t && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD_T}
              y2={volBottom}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.6"
            />
            <circle
              cx={x(hover)}
              cy={priceY(t.close)}
              r="3.5"
              fill={t.close >= t.open ? "#34d399" : "#fb7185"}
              stroke="#030712"
              strokeWidth="1.5"
            />
          </g>
        )}
        {bars.map((bar, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text
              key={`x${i}`}
              x={x(i)}
              y={H_TOTAL - 4}
              fontSize="10"
              fill="#64748b"
              textAnchor="middle"
            >
              {bar.date.slice(5)}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}
