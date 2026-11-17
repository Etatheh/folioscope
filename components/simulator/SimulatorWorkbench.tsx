"use client";

import { useEffect, useMemo, useState } from "react";

import MarketSearch from "@/components/watchlist/MarketSearch";
import {
  DEFAULT_PERIOD,
  fmtMoney,
  fmtPct,
  periodMonths,
  type PeriodKey,
} from "@/components/dca/engine";
import { useAnimatedNumber } from "@/components/dca/hooks";
import MonthlyControl from "@/components/dca/MonthlyControl";
import PeriodTabs from "@/components/dca/PeriodTabs";
import { showToast } from "@/components/ui/ToastHost";
import { apiFetch } from "@/lib/client-api";
import type { SimulationData } from "@/lib/us-stocks";
import { hasFullDashboardAccess, type ViewerPlan } from "@/lib/access";
import { dict, type Lang } from "@/lib/i18n";
import { useViewerPlan } from "@/lib/use-profile";
import {
  BACKTEST_ADD_EVENT,
  normalizeSymbol,
  takeQueuedBacktestSymbol,
} from "@/lib/watchlist";
import {
  computeSimulation,
  type SimFrequency,
  type SimMode,
} from "./engine";
import SimulatorChart from "./SimulatorChart";

const MAX_MONTHLY = 5000;
const MIN_MONTHLY = 50;

export default function SimulatorWorkbench({
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

  const [mode, setMode] = useState<SimMode>("lump");
  const [capital, setCapital] = useState(10000);
  const [contribution, setContribution] = useState(500);
  const [frequency, setFrequency] = useState<SimFrequency>("monthly");
  const [period, setPeriod] = useState<PeriodKey>(DEFAULT_PERIOD);
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
        .filter((symbol) => mergedData.series[symbol]?.length > 1)
        .map((symbol) => ({ symbol })),
    [mergedData]
  );

  const initialSelected = useMemo(() => {
    const fromDefaults = defaults.filter(
      (symbol) => data.series[symbol]?.length > 1
    );
    if (fromDefaults.length > 0) return fromDefaults;
    return Object.keys(data.series)
      .filter((symbol) => data.series[symbol]?.length > 1)
      .slice(0, 4);
  }, [data.series, defaults]);

  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [weights, setWeights] = useState<Record<string, number>>(() =>
    Object.fromEntries(initialSelected.map((symbol) => [symbol, 10]))
  );

  const maxMonths = Math.max(1, Math.floor(data.dates.length / 21));
  const months = Math.min(periodMonths(period), maxMonths);

  const totalWeight = selected.reduce(
    (sum, symbol) => sum + Math.max(0, weights[symbol] ?? 0),
    0
  );

  const displayPcts = useMemo(() => {
    if (selected.length === 0) return [];
    const basis =
      totalWeight > 0
        ? selected.map((symbol) => Math.max(0, weights[symbol] ?? 0))
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

  const result = useMemo(
    () =>
      computeSimulation({
        dates: mergedData.dates,
        series: mergedData.series,
        selected,
        weights,
        mode,
        capital,
        contribution,
        frequency,
        months,
      }),
    [
      mergedData.dates,
      mergedData.series,
      selected,
      weights,
      mode,
      capital,
      contribution,
      frequency,
      months,
    ]
  );

  /**
 * Build the two series exactly as the legacy chart consumed them.
 *
 * Lump Sum keeps the original normalized-100 view: emerald = portfolio,
 * slate dashed = S&P 500. DCA switches to absolute dollars: emerald =
 * portfolio market value, slate dashed = cumulative invested principal.
 */
  const chartData = useMemo(() => {
    if (!result) return null;
    const labels = result.curve.map((point) => point.month);

    if (mode === "lump") {
      const startIndex = Math.max(0, mergedData.dates.length - result.days);
      const benchmark = mergedData.benchmark.closes.slice(
        startIndex,
        startIndex + result.days
      );
      let base = NaN;
      for (const value of benchmark) {
        if (Number.isFinite(value) && value > 0) {
          base = value;
          break;
        }
      }
      return {
        labels,
        primary: result.curve.map(
          (point) => (point.value / Math.max(1, capital)) * 100
        ),
        secondary: benchmark.map((value) =>
          Number.isFinite(value) && base > 0 ? (value / base) * 100 : NaN
        ),
        mode: "percent" as const,
        legendPrimary: t.legendPortfolio,
        legendSecondary: t.legendBenchmark,
      };
    }

    return {
      labels,
      primary: result.curve.map((point) => point.value),
      secondary: result.curve.map((point) => point.invested),
      mode: "value" as const,
      legendPrimary: t.legendValue,
      legendSecondary: t.legendInvested,
    };
  }, [
    result,
    mode,
    capital,
    mergedData.dates.length,
    mergedData.benchmark.closes,
    t.legendPortfolio,
    t.legendBenchmark,
    t.legendValue,
    t.legendInvested,
  ]);

  const invested = useAnimatedNumber(result?.invested ?? 0);
  const finalValue = useAnimatedNumber(result?.finalValue ?? 0);
  const totalReturn = useAnimatedNumber((result?.totalReturn ?? 0) * 100);
  const maxDrawdown = useAnimatedNumber((result?.maxDrawdown ?? 0) * 100);
  const cagr = useAnimatedNumber((result?.cagr ?? 0) * 100);

  const toggle = (symbol: string) => {
    setSelected((prev) =>
      prev.includes(symbol)
        ? prev.filter((item) => item !== symbol)
        : [...prev, symbol]
    );
    setWeights((prev) =>
      prev[symbol] !== undefined ? prev : { ...prev, [symbol]: 10 }
    );
  };

  const equalize = () =>
    setWeights(() => Object.fromEntries(selected.map((symbol) => [symbol, 1])));

  // Pro search can add any U.S. ticker. Fetch its daily closes once and
  // forward-fill them onto the simulator calendar.
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
          .getElementById("simulator-workbench")
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
          .getElementById("simulator-workbench")
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

  // A "sync to backtest" click made from the Watchlist view leaves the symbol
  // in sessionStorage, then lands here. Replay it once the listener is ready.
  useEffect(() => {
    const pending = takeQueuedBacktestSymbol();
    if (!pending) return;
    window.dispatchEvent(
      new CustomEvent(BACKTEST_ADD_EVENT, { detail: { symbol: pending } })
    );
  }, []);

  const retColor = (value: number) =>
    value >= 0 ? "text-emerald-400" : "text-rose-400";

  const stats = [
    {
      label: t.invested,
      value: `$${fmtMoney(invested)}`,
      tone: "text-slate-200",
    },
    {
      label: t.finalValueLabel,
      value: `$${fmtMoney(finalValue)}`,
      tone: "text-white",
    },
    {
      label: t.returnLabel,
      value: result ? fmtPct(result.totalReturn) : "—",
      tone: result ? retColor(totalReturn) : "text-slate-400",
    },
    {
      label: t.drawdownLabel,
      value: result ? `-${maxDrawdown.toFixed(1)}%` : "—",
      tone: "text-rose-400",
    },
    {
      label: t.cagr,
      value:
        result?.cagr === null || result?.cagr === undefined
          ? "—"
          : fmtPct(result.cagr),
      tone:
        result?.cagr === null || result?.cagr === undefined
          ? "text-slate-400"
          : retColor(cagr),
    },
  ];

  return (
    <article
      id="simulator-workbench"
      className="data-card min-w-0 overflow-x-clip rounded-2xl p-5 sm:p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-white">
            {t.title}
            <span className="ml-2 text-xs font-normal text-slate-500">
              {t.subtitle}
            </span>
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">{t.modeHint}</p>
        </div>

        <div
          role="tablist"
          aria-label={t.title}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1"
        >
          {(
            [
              { key: "lump", label: t.modeLump },
              { key: "dca", label: t.modeDca },
            ] as const
          ).map((option) => {
            const selectedMode = mode === option.key;
            return (
              <button
                key={option.key}
                type="button"
                role="tab"
                aria-selected={selectedMode}
                onClick={() => setMode(option.key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  selectedMode
                    ? "bg-gradient-to-r from-blue-500/30 to-purple-500/35 text-white ring-1 ring-purple-400/30"
                    : "text-slate-500 hover:text-slate-200"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="mt-4 grid min-w-0 gap-3 sm:flex sm:flex-wrap sm:items-end">
        {mode === "lump" ? (
          <label className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-slate-500">
            <span className="whitespace-nowrap">{t.startingCapital}</span>
            <span className="text-slate-300">$</span>
            <input
              type="number"
              min={100}
              step={1000}
              value={capital}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isFinite(value) && value > 0) {
                  setCapital(Math.round(value));
                }
              }}
              className="w-24 min-w-0 bg-transparent text-right text-sm tabular-nums text-slate-200 outline-none"
              aria-label={t.startingCapital}
            />
          </label>
        ) : (
          <div className="min-w-0">
            <MonthlyControl
              label={t.contribution}
              value={contribution}
              onChange={setContribution}
              min={MIN_MONTHLY}
              max={MAX_MONTHLY}
              step={50}
            />
          </div>
        )}

        <div className="min-w-0">
          <PeriodTabs
            lang={lang}
            value={period}
            onChange={setPeriod}
            maxMonths={maxMonths}
          />
        </div>

        {mode === "dca" && (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-500">{t.frequency}</span>
            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] p-0.5">
              {(
                [
                  { key: "weekly", label: t.frequencies.weekly },
                  { key: "biweekly", label: t.frequencies.biweekly },
                  { key: "monthly", label: t.frequencies.monthly },
                ] as const
              ).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFrequency(option.key)}
                  className={`rounded-lg px-2 py-1 text-[10px] font-medium transition ${
                    frequency === option.key
                      ? "bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-white"
                      : "text-slate-500 hover:text-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-[11px] uppercase tracking-wider text-slate-600">
              {t.assets}
            </p>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] tabular-nums text-slate-500">
              {t.selectedCount(selected.length)}
            </span>
          </div>
          {syncingSymbol && (
            <span className="text-[10px] text-purple-300">
              {syncingSymbol} · {dict[lang].watchlist.syncing}
            </span>
          )}
        </div>

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

        {!hasFullAccess && (
          <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
            {t.freePoolHint}
          </p>
        )}
        {hasFullAccess && (
          <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
            {t.proSearchHint}
          </p>
        )}
      </div>

      {selected.length > 0 && (
        <div className="mt-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-wider text-slate-600">
              {t.weight}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-[10px] tabular-nums text-slate-600">
                {t.totalWeight}{" "}
                <span className="text-slate-400">100%</span>
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
          <div className="mt-2 grid min-w-0 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {selected.map((symbol, index) => {
              const weight = weights[symbol] ?? 10;
              const pct = displayPcts[index] ?? 0;
              return (
                <label
                  key={symbol}
                  className="flex min-w-0 items-center gap-2 text-xs text-slate-400"
                >
                  <span className="w-14 shrink-0 truncate tabular-nums">{symbol}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={weight}
                    onChange={(event) =>
                      setWeights((prev) => ({
                        ...prev,
                        [symbol]: Number(event.target.value),
                      }))
                    }
                    className="h-1 min-w-0 flex-1 cursor-pointer accent-purple-500"
                    aria-label={`${symbol} ${t.weight}`}
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

      {hasFullAccess && (
        <div className="mt-3 min-w-0">
          <MarketSearch lang={lang} plan={effectivePlan} />
        </div>
      )}

      {result ? (
        <>
          <div className="mt-4 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-5">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <p className="truncate text-[11px] text-slate-600">{stat.label}</p>
                <p
                  className={`mt-1 truncate text-base font-semibold tabular-nums ${stat.tone}`}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 min-w-0">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <p className="uppercase tracking-wider text-slate-600">
                {t.chartTitleSim}
              </p>
              <p className="tabular-nums text-slate-600">
                {result.days} {t.days} · {result.startDate} → {result.endDate}
              </p>
            </div>
            {chartData && (
              <SimulatorChart
                labels={chartData.labels}
                primary={chartData.primary}
                secondary={chartData.secondary}
                mode={chartData.mode}
                legendPrimary={chartData.legendPrimary}
                legendSecondary={chartData.legendSecondary}
                ariaLabel={t.chartTitleSim}
              />
            )}
          </div>
        </>
      ) : (
        <p className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm text-slate-500">
          {t.empty}
        </p>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-slate-600">
        {t.statsNote}
        <br />
        {t.disclaimer}
      </p>
    </article>
  );
}