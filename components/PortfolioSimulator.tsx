"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { dict, type Lang } from "@/lib/i18n";
import type { SimulationData } from "@/lib/us-stocks";
import { hasFullDashboardAccess, type ViewerPlan } from "@/lib/access";
import { useViewerPlan } from "@/lib/use-profile";
import { apiFetch } from "@/lib/client-api";
import { BACKTEST_ADD_EVENT, normalizeSymbol } from "@/lib/watchlist";
import { showToast } from "./ui/ToastHost";
import { fmtSigned } from "./market-ui";
import AnimatedNumber from "./ui/AnimatedNumber";
import ProUpgradeButton from "./ui/ProUpgradeButton";

const RANGES = [21, 63, 126, 252];
const FREE_RANGE_MAX = 1;

export default function PortfolioSimulator({
  lang,
  plan,
  data,
  defaults,
}: {
  lang: Lang;
  plan: ViewerPlan;
  data: SimulationData;
  defaults: string[];
}) {
  const t = dict[lang].simulator;
  const effectivePlan = useViewerPlan(plan);
  const hasFullAccess = hasFullDashboardAccess(effectivePlan);
  const [limitHit, setLimitHit] = useState(false);
  const [extraSeries, setExtraSeries] = useState<Record<string, number[]>>({});
  const [syncingSymbol, setSyncingSymbol] = useState<string | null>(null);

  const mergedData = useMemo<SimulationData>(
    () => ({
      ...data,
      series: { ...data.series, ...extraSeries },
    }),
    [data, extraSeries]
  );

  const stocks = useMemo(
    () =>
      Object.keys(mergedData.series)
        .filter((s) => mergedData.series[s] && mergedData.series[s].length > 1)
        .map((symbol) => ({ symbol })),
    [mergedData]
  );

  const [capital, setCapital] = useState(10000);
  const [rangeIdx, setRangeIdx] = useState(FREE_RANGE_MAX);
  const [selected, setSelected] = useState<string[]>(defaults);
  const [weights, setWeights] = useState<Record<string, number>>(() =>
    Object.fromEntries(defaults.map((s) => [s, 10]))
  );
  const [hover, setHover] = useState<number | null>(null);

  // Free plan is clamped to short ranges; Pro unlocks the rest.
  const activeRange = hasFullAccess ? rangeIdx : Math.min(rangeIdx, FREE_RANGE_MAX);
  const count = RANGES[activeRange];

  const win = useMemo(() => {
    const n = mergedData.dates.length;
    const start = Math.max(0, n - count);
    return {
      dates: mergedData.dates.slice(start),
      series: Object.fromEntries(
        Object.entries(mergedData.series).map(([s, arr]) => [s, arr.slice(start)])
      ) as Record<string, number[]>,
      benchmark: mergedData.benchmark.closes.slice(start),
    };
  }, [mergedData, count]);

  const totalWeight = selected.reduce((sum, s) => sum + Math.max(0, weights[s] ?? 0), 0);

  // Integer percentages that always add up to 100 (largest-remainder rounding).
  const displayPcts = useMemo(() => {
    if (selected.length === 0) return [];
    const basis =
      totalWeight > 0
        ? selected.map((s) => Math.max(0, weights[s] ?? 0))
        : selected.map(() => 1);
    const basisSum = basis.reduce((sum, value) => sum + value, 0) || 1;
    const raw = basis.map((value) => (value / basisSum) * 100);
    const floors = raw.map((value) => Math.floor(value));
    const remaining = 100 - floors.reduce((sum, value) => sum + value, 0);
    const order = raw
      .map((value, index) => ({ index, frac: value - Math.floor(value) }))
      .sort((a, b) => b.frac - a.frac);
    const out = [...floors];
    for (let i = 0; i < remaining; i += 1) {
      out[order[i % order.length].index] += 1;
    }
    return out;
  }, [selected, totalWeight, weights]);

  const calc = useMemo(() => {
    const len = win.dates.length;
    const active = selected.filter((s) => win.series[s] && Number.isFinite(win.series[s][0]));
    if (len < 2 || active.length === 0) return null;
    const norm = (s: string) =>
      totalWeight > 0 ? Math.max(0, weights[s] ?? 0) / totalWeight : 1 / active.length;
    const port: number[] = [];
    for (let i = 0; i < len; i++) {
      let v = 0;
      for (const s of active) {
        const arr = win.series[s];
        v += norm(s) * (arr[i] / arr[0]);
      }
      port.push(capital * v);
    }
    const benchBase = win.benchmark.find((v) => Number.isFinite(v));
    const bench = win.benchmark.map((v) => (benchBase ? (v / benchBase) * 100 : NaN));
    let peak = -Infinity;
    let maxDd = 0;
    for (const v of port) {
      peak = Math.max(peak, v);
      if (peak > 0) maxDd = Math.max(maxDd, (peak - v) / peak);
    }
    return {
      port,
      bench,
      finalValue: port[port.length - 1],
      totalReturn: port[port.length - 1] / capital - 1,
      benchReturn: benchBase ? (win.benchmark[win.benchmark.length - 1] - benchBase) / benchBase : NaN,
      maxDd,
    };
  }, [win, selected, totalWeight, capital, weights]);

  const toggle = (symbol: string) => {
    setSelected((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
    setWeights((prev) => (prev[symbol] !== undefined ? prev : { ...prev, [symbol]: 10 }));
  };

  const equalize = () =>
    setWeights(() => Object.fromEntries(selected.map((s) => [s, 1])));

  // Pro search can push any U.S. ticker into this backtest pool. We fetch its
  // daily closes once and forward-fill them onto the simulator's calendar.
  useEffect(() => {
    const onAdd = async (event: Event) => {
      const raw = (event as CustomEvent<{ symbol?: string }>).detail?.symbol;
      const symbol = normalizeSymbol(raw ?? "");
      if (!symbol) return;

      const addToSelection = () => {
        setSelected((prev) => (prev.includes(symbol) ? prev : [...prev, symbol]));
        setWeights((prev) =>
          prev[symbol] !== undefined ? prev : { ...prev, [symbol]: 10 }
        );
      };

      if (mergedData.series[symbol]) {
        addToSelection();
        showToast(dict[lang].watchlist.syncedToast(symbol));
        document
          .getElementById("investments")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      setSyncingSymbol(symbol);
      try {
        const response = await apiFetch(
          `/api/markets/series?symbol=${encodeURIComponent(symbol)}`
        );
        if (!response.ok) throw new Error("series unavailable");
        const payload = (await response.json()) as {
          bars?: { date: string; close: number }[];
        };
        if (!payload.bars || payload.bars.length === 0) {
          throw new Error("empty series");
        }

        const closeByDate = new Map(
          payload.bars.map((bar) => [bar.date, bar.close])
        );
        let last = NaN;
        const closes = data.dates.map((date) => {
          const close = closeByDate.get(date);
          if (close !== undefined) last = close;
          return Number.isFinite(last) ? last : NaN;
        });

        if (closes.filter((value) => Number.isFinite(value)).length < 2) {
          throw new Error("series could not be aligned");
        }

        setExtraSeries((current) => ({ ...current, [symbol]: closes }));
        addToSelection();
        showToast(dict[lang].watchlist.syncedToast(symbol));
        document
          .getElementById("investments")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {
        showToast(dict[lang].watchlist.syncFailed);
      } finally {
        setSyncingSymbol(null);
      }
    };

    window.addEventListener(BACKTEST_ADD_EVENT, onAdd);
    return () => window.removeEventListener(BACKTEST_ADD_EVENT, onAdd);
  }, [data.dates, lang, mergedData.series]);

  const chart = useMemo(() => {
    if (!calc) return null;
    const W = 720;
    const H = 240;
    const pl = 8;
    const pr = 56;
    const pt = 12;
    const pb = 22;
    const plotW = W - pl - pr;
    const plotH = H - pt - pb;
    const values: number[] = [];
    for (let i = 0; i < calc.port.length; i++) {
      values.push((calc.port[i] / capital) * 100);
      if (Number.isFinite(calc.bench[i])) values.push(calc.bench[i]);
    }
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      min = 90;
      max = 110;
    }
    const pad = (max - min) * 0.08 || 1;
    min -= pad;
    max += pad;
    const x = (i: number) => pl + (i / Math.max(1, calc.port.length - 1)) * plotW;
    const y = (v: number) => pt + ((max - v) / (max - min)) * plotH;
    const line = (series: number[], normalized: (v: number) => number) => {
      let d = "";
      series.forEach((v, i) => {
        if (!Number.isFinite(v)) return;
        d += `${d ? "L" : "M"}${x(i).toFixed(1)} ${y(normalized(v)).toFixed(1)}`;
      });
      return d;
    };
    const portVals = calc.port.map((v) => (v / capital) * 100);
    return {
      W,
      H,
      pl,
      pr,
      plotW,
      plotH,
      min,
      max,
      portVals,
      x,
      y,
      portPath: line(portVals, (v) => v),
      benchPath: line(calc.bench, (v) => v),
      grid: [0, 1, 2, 3, 4].map((i) => min + ((max - min) * i) / 4),
      labelEvery: Math.max(1, Math.ceil(win.dates.length / 6)),
    };
  }, [calc, win, capital]);

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!chart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const px = ((e.clientX - rect.left) / rect.width) * chart.W;
    const n = calc?.port.length ?? 0;
    if (n === 0) return;
    const idx = Math.min(n - 1, Math.max(0, Math.round(((px - chart.pl) / chart.plotW) * (n - 1))));
    setHover(idx);
  };

  const hoverText =
    hover !== null && calc
      ? `${win.dates[hover]} · ${t.legendPortfolio} ${fmtSigned((calc.port[hover] / capital - 1) * 100)}%${
          Number.isFinite(calc.bench[hover]) ? ` · ${t.legendBenchmark} ${fmtSigned((calc.bench[hover] / 100 - 1) * 100)}%` : ""
        }`
      : "";

  const retColor = (v: number) => (v >= 0 ? "text-emerald-400" : "text-rose-400");

  return (
    <article className="data-card rounded-2xl p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">
            {t.title}
            <span className="ml-2 text-xs font-normal text-slate-500">{t.subtitle}</span>
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
            <span className="whitespace-nowrap">{t.capital}</span>
            <span className="text-slate-300">$</span>
            <input
              type="number"
              min={100}
              step={1000}
              value={capital}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v > 0) setCapital(Math.round(v));
              }}
              className="w-20 bg-transparent text-right text-slate-200 outline-none"
              aria-label={t.capital}
            />
          </label>
          <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
            {t.range.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (i > FREE_RANGE_MAX && !hasFullAccess) {
                    setLimitHit(true);
                    return;
                  }
                  setLimitHit(false);
                  setRangeIdx(i);
                }}
                className={`rounded-md px-2 py-1 transition ${
                  i === activeRange
                    ? "bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-white"
                    : "text-slate-500 hover:text-slate-200"
                }`}
              >
                {label}
                {i > FREE_RANGE_MAX && !hasFullAccess ? " 🔒" : ""}
              </button>
            ))}
          </div>
        </div>
      </header>

      {limitHit && (
        <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[11px] text-amber-300">
          {t.proRange} ·{" "}
          <ProUpgradeButton
            lang={lang}
            variant="link"
            label={t.upgrade}
            source="simulator-range"
            className="underline decoration-dotted hover:text-amber-200"
          />
        </p>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-wider text-slate-600">{t.pickStocks}</p>
          {syncingSymbol && (
            <span className="text-[10px] text-purple-300">
              {syncingSymbol} · {dict[lang].watchlist.syncing}
            </span>
          )}
        </div>
        {!hasFullAccess && (
          <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
            {t.freePoolHint}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {stocks.map(({ symbol }) => {
            const on = selected.includes(symbol);
            return (
              <button
                key={symbol}
                type="button"
                onClick={() => toggle(symbol)}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                  on
                    ? "border-purple-400/40 bg-purple-500/15 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-500 hover:border-white/20 hover:text-slate-300"
                }`}
              >
                {symbol}
              </button>
            );
          })}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-slate-600">{t.weight}</p>
            <div className="flex items-center gap-3">
              <span className="text-[10px] tabular-nums text-slate-600">
                {t.totalWeight}{" "}
                <span className="text-slate-400">{selected.length > 0 ? "100%" : "0%"}</span>
              </span>
              <button
                type="button"
                onClick={equalize}
                className="text-[11px] text-purple-400 transition hover:text-purple-300"
              >
                {t.equalWeight}
              </button>
            </div>
          </div>
          <div className="mt-2 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {selected.map((symbol, index) => {
              const w = weights[symbol] ?? 10;
              const pct = displayPcts[index] ?? 0;
              return (
                <label key={symbol} className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-12 shrink-0 tabular-nums">{symbol}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={w}
                    onChange={(e) =>
                      setWeights((prev) => ({ ...prev, [symbol]: Number(e.target.value) }))
                    }
                    className="h-1 flex-1 cursor-pointer accent-purple-500"
                  />
                  <span className="w-10 shrink-0 text-right tabular-nums text-slate-500">
                    {pct}%
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {calc ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[11px] text-slate-600">{t.finalValue}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                $<AnimatedNumber value={calc.finalValue} digits={0} group />
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[11px] text-slate-600">{t.totalReturn}</p>
              <p className={`mt-1 text-lg font-semibold tabular-nums ${retColor(calc.totalReturn)}`}>
                <AnimatedNumber
                  value={calc.totalReturn * 100}
                  digits={2}
                  signed
                  suffix="%"
                />
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[11px] text-slate-600">{t.maxDrawdown}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-rose-400">
                -
                <AnimatedNumber
                  value={calc.maxDd * 100}
                  digits={1}
                  suffix="%"
                />
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[11px] text-slate-600">{t.vsBenchmark}</p>
              <p className={`mt-1 text-lg font-semibold tabular-nums ${retColor(calc.totalReturn - calc.benchReturn)}`}>
                {Number.isFinite(calc.benchReturn) ? (
                  <AnimatedNumber
                    value={(calc.totalReturn - calc.benchReturn) * 100}
                    digits={2}
                    signed
                    suffix="%"
                  />
                ) : (
                  "—"
                )}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <p className="uppercase tracking-wider text-slate-600">{t.chartTitle}</p>
              <div className="flex items-center gap-3 text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-4 rounded bg-emerald-400" />
                  {t.legendPortfolio}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-4 rounded bg-slate-400" />
                  {t.legendBenchmark}
                </span>
              </div>
            </div>
            <div className="text-right text-[11px] tabular-nums text-slate-500">{hoverText}</div>
            {chart && (
              <svg
                viewBox={`0 0 ${chart.W} ${chart.H}`}
                className="w-full select-none"
                onMouseMove={onMove}
                onMouseLeave={() => setHover(null)}
                role="img"
                aria-label={t.chartTitle}
              >
                {chart.grid.map((v) => (
                  <g key={v}>
                    <line
                      x1={chart.pl}
                      x2={chart.W - chart.pr}
                      y1={chart.y(v)}
                      y2={chart.y(v)}
                      stroke="rgba(148,163,184,0.10)"
                    />
                    <text x={chart.W - chart.pr + 6} y={chart.y(v) + 3.5} fontSize="10" fill="#64748b">
                      {v.toFixed(0)}
                    </text>
                  </g>
                ))}
                <path d={chart.benchPath} fill="none" stroke="#94a3b8" strokeWidth="1.4" strokeDasharray="5 4" opacity="0.7" />
                <path d={chart.portPath} fill="none" stroke="#34d399" strokeWidth="2" strokeLinejoin="round" />
                {hover !== null && calc && (
                  <g>
                    <line
                      x1={chart.x(hover)}
                      x2={chart.x(hover)}
                      y1={12}
                      y2={chart.H - 22}
                      stroke="#94a3b8"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      opacity="0.6"
                    />
                    <circle
                      cx={chart.x(hover)}
                      cy={chart.y(chart.portVals[hover])}
                      r="3.5"
                      fill="#34d399"
                      stroke="#030712"
                      strokeWidth="1.5"
                    />
                  </g>
                )}
                {win.dates.map((d, i) =>
                  i % chart.labelEvery === 0 || i === win.dates.length - 1 ? (
                    <text key={d} x={chart.x(i)} y={chart.H - 4} fontSize="10" fill="#64748b" textAnchor="middle">
                      {d.slice(5)}
                    </text>
                  ) : null
                )}
              </svg>
            )}
          </div>
        </>
      ) : (
        <p className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm text-slate-500">
          {t.empty}
        </p>
      )}

      <p className="mt-3 text-[11px] text-slate-600">{t.disclaimer}</p>
    </article>
  );
}
