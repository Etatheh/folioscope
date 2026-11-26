"use client";

import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import { fmtMoney } from "@/components/dca/engine";
import { fmtSigned } from "@/components/market-ui";
import { niceValueDomain, valueAxisLabel } from "./chart-math";
import styles from "./simulator.module.css";

const PL = 8;
const PR = 70;
const PT = 14;
const PB = 25;

export default function SimulatorChart({ labels, primary, secondary, tertiary, mode, legendPrimary, legendSecondary, legendTertiary, ariaLabel, monthly = false, accountLabel, relativeLabel = "Alpha" }: {
  labels: string[];
  primary: number[];
  secondary: number[];
  tertiary?: number[];
  mode: "percent" | "value";
  legendPrimary: string;
  legendSecondary: string;
  legendTertiary?: string;
  ariaLabel: string;
  monthly?: boolean;
  accountLabel?: string;
  relativeLabel?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const plotRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 960, height: 240 });
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    if (!plotRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(plotRef.current);
    return () => observer.disconnect();
  }, []);

  const W = size.width;
  const H = size.height;
  const plotWidth = Math.max(1, W - PL - PR);
  const plotHeight = Math.max(1, H - PT - PB);
  const hasBenchmark = secondary.some(Number.isFinite);
  const chart = useMemo(() => {
    if (labels.length < 2) return null;
    const values = [...primary, ...secondary, ...(tertiary ?? [])].filter(Number.isFinite);
    const { min, max, ticks } = niceValueDomain(values, mode === "value");
    const x = (i: number) => PL + i / (labels.length - 1) * plotWidth;
    const y = (value: number) => PT + (max - value) / (max - min) * plotHeight;
    const line = (series: number[], stepped = false) => {
      let path = "";
      let connected = false;
      series.forEach((value, i) => {
        if (!Number.isFinite(value)) { connected = false; return; }
        const px = x(i).toFixed(2);
        const py = y(value).toFixed(2);
        path += !connected ? `M${px},${py}` : stepped ? `H${px}V${py}` : `L${px},${py}`;
        connected = true;
      });
      return path;
    };
    const primaryPath = line(primary);
    return { x, y, ticks, primaryPath, secondaryPath: line(secondary), tertiaryPath: tertiary ? line(tertiary, true) : "",
      area: `${primaryPath}L${x(labels.length - 1)},${H - PB}L${PL},${H - PB}Z`,
      labelIndices: Array.from(new Set(Array.from({ length: W < 500 ? 4 : 6 }, (_, index) => Math.round(index / (W < 500 ? 3 : 5) * (labels.length - 1))))) };
  }, [labels.length, primary, secondary, tertiary, mode, plotWidth, plotHeight, H, W]);

  const inspect = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * W;
    setHover(Math.min(labels.length - 1, Math.max(0, Math.round((x - PL) / plotWidth * (labels.length - 1)))));
  };
  const index = hover === null ? null : Math.min(hover, labels.length - 1);
  const primaryValue = index === null ? NaN : primary[index];
  const benchmarkValue = index === null ? NaN : secondary[index];
  const investedValue = index === null ? NaN : tertiary?.[index] ?? NaN;
  const last = primary.length - 1;
  const format = (value: number) => mode === "value" ? `$${fmtMoney(value)}` : `${value.toFixed(1)}%`;

  return (
    <div className={styles.chart}>
      <div className={styles.chartLegend}>
        <span><i />{legendPrimary}</span>
        <span><i className={styles.benchmarkLine} />{legendSecondary}</span>
        {tertiary && <span><i className={styles.principalLine} />{legendTertiary}</span>}
      </div>
      {!hasBenchmark && <p role="status" className="mb-2 text-[11px] text-amber-300/80">S&amp;P 500 history is temporarily unavailable for this range. Reload to retry.</p>}
      <div ref={plotRef} className={styles.plot}>
        {chart && <>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} tabIndex={0}
            aria-describedby={`chart-help-${uid}`}
            onPointerMove={inspect} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); inspect(event); }}
            onPointerUp={(event) => { event.currentTarget.releasePointerCapture(event.pointerId); if (event.pointerType === "touch") setHover(null); }}
            onPointerLeave={() => setHover(null)} onPointerCancel={() => setHover(null)} onBlur={() => setHover(null)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End", "Escape"].includes(event.key)) return;
              event.preventDefault();
              if (event.key === "Escape") setHover(null);
              else if (event.key === "Home") setHover(0);
              else if (event.key === "End") setHover(last);
              else setHover((current) => Math.min(last, Math.max(0, (current ?? last) + (event.key === "ArrowRight" ? 1 : -1))));
            }}>
            <defs>
              <linearGradient id={`area-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#59c9a5" stopOpacity=".12" /><stop offset="100%" stopColor="#59c9a5" stopOpacity="0" /></linearGradient>
              <filter id={`glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            {chart.ticks.map((value) => <g key={value}>
              <line x1={PL} x2={W - PR} y1={chart.y(value)} y2={chart.y(value)} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 5" />
              <text x={W - PR + 14} y={chart.y(value) + 3.5} fontSize="10" fill="#71717a">{mode === "value" ? valueAxisLabel(value) : `${value}%`}</text>
            </g>)}
            <path d={chart.area} fill={`url(#area-${uid})`} />
            <path d={chart.secondaryPath} fill="none" stroke="#d4d4d8" strokeWidth="1.2" strokeDasharray="5 4" opacity=".75" />
            {tertiary && <path d={chart.tertiaryPath} fill="none" stroke="#dbb76b" strokeWidth="1.2" strokeDasharray="3 4" opacity=".8" />}
            <path d={chart.primaryPath} fill="none" stroke="#59c9a5" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" filter={`url(#glow-${uid})`} />
            {Number.isFinite(primary[last]) && <g aria-label={`Final value ${format(primary[last])}`} data-value={primary[last]}>
              <circle cx={chart.x(last)} cy={chart.y(primary[last])} r="6" fill="#59c9a5" opacity=".16" className={styles.endpoint} />
              <circle cx={chart.x(last)} cy={chart.y(primary[last])} r="2.8" fill="#59c9a5" stroke="#11131a" strokeWidth="1.5" />
            </g>}
            {index !== null && Number.isFinite(primaryValue) && <g pointerEvents="none">
              <line x1={PL} x2={W - PR} y1={chart.y(primaryValue)} y2={chart.y(primaryValue)} stroke="#a1a1aa" strokeDasharray="3 4" opacity=".25" />
              <line x1={chart.x(index)} x2={chart.x(index)} y1={PT} y2={H - PB} stroke="#a1a1aa" strokeDasharray="3 4" opacity=".5" />
              <circle cx={chart.x(index)} cy={chart.y(primaryValue)} r="4" fill="#59c9a5" stroke="#11131a" strokeWidth="2" />
            </g>}
            {chart.labelIndices.map((i) => <text key={i} x={chart.x(i)} y={H - 5} fontSize="10" fill="#71717a" textAnchor={i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"}>{(monthly || (accountLabel && W < 500)) ? labels[i].slice(2, 7) : labels[i]}</text>)}
          </svg>
          {index !== null && Number.isFinite(primaryValue) && <div className={styles.tooltip} role="status" style={{ left: Math.max(8, Math.min(W - Math.min(240, W * 0.8) - 8, chart.x(index) > W / 2 ? chart.x(index) - Math.min(240, W * 0.8) - 16 : chart.x(index) + 16)) }}>
            <time>{labels[index]}</time>
            <div><span>{legendPrimary}</span><b style={{ color: "#59c9a5" }}>{format(primaryValue)}</b></div>
            {Number.isFinite(benchmarkValue) && <div><span>{legendSecondary}</span><b>{format(benchmarkValue)}</b></div>}
            {Number.isFinite(investedValue) && <div><span>{legendTertiary}</span><b style={{ color: "#dbb76b" }}>{format(investedValue)}</b></div>}
            {investedValue > 0 && <div><span>P/L</span><b>{fmtSigned((primaryValue / investedValue - 1) * 100)}%</b></div>}
            {benchmarkValue > 0 && <div><span>{relativeLabel}</span><b>{fmtSigned((primaryValue / benchmarkValue - 1) * 100)}%</b></div>}
          </div>}
        </>}
      </div>
      <div className={styles.chartFooter}><span id={`chart-help-${uid}`}>Hover or drag to inspect · {monthly ? "Month-end" : "Daily"} close<span className="sr-only">. Use left and right arrows to inspect observations. Home and End jump to endpoints.</span></span><span>USD · {accountLabel ?? (tertiary ? "Includes cash flows" : "Buy & hold")}</span></div>
    </div>
  );
}
