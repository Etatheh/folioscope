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
import UpgradeModal from "@/components/ui/UpgradeModal";
import { apiFetch } from "@/lib/client-api";
import type { SimulationData } from "@/lib/us-stocks";
import { hasFullDashboardAccess, type ViewerPlan } from "@/lib/access";
import { dict, type Lang } from "@/lib/i18n";
import { setAiSimulator } from "@/lib/ai-context-store";
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

const PERIOD_LABEL: Record<PeriodKey, string> = {
  m6: "6M",
  y1: "1Y",
  y3: "3Y",
  y5: "5Y",
  y10: "10Y",
};

const CUSTOM_SCENARIOS = [
  {
    key: "tech-bear",
    label: "2022 Tech Bear",
    range: "2021-11 → 2023-06",
    start: "2021-11-01",
    end: "2023-06-30",
  },
  {
    key: "covid-crash",
    label: "COVID Crash",
    range: "2020-02 → 2021-11",
    start: "2020-02-01",
    end: "2021-11-30",
  },
  {
    key: "ai-bull",
    label: "AI Bull Run",
    range: "2023-01 → Present",
    start: "2023-01-01",
    end: null,
  },
] as const;

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
  const [initialDeposit, setInitialDeposit] = useState(0);
  const [contribution, setContribution] = useState(500);
  const [frequency, setFrequency] = useState<SimFrequency>("monthly");
  const [period, setPeriod] = useState<PeriodKey>(DEFAULT_PERIOD);
  const [extraSeries, setExtraSeries] = useState<Record<string, number[]>>({});
  const [syncingSymbol, setSyncingSymbol] = useState<string | null>(null);

  const latestHistoryDate = data.dates.at(-1) ?? "";
  const earliestHistoryDate = data.dates[0] ?? "";
  const defaultCustomStart =
    data.dates[
      Math.max(
        0,
        data.dates.length -
          Math.round(periodMonths(DEFAULT_PERIOD) * 21)
      )
    ] ?? earliestHistoryDate;
  const [customActive, setCustomActive] = useState(false);
  const [customStart, setCustomStart] = useState(defaultCustomStart);
  const [customEnd, setCustomEnd] = useState(latestHistoryDate);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

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
  // 10Y is Pro-only. Keep a safe display state even if the plan changes while
  // the page is open or the server sends an unexpected period.
  const safePeriod: PeriodKey =
    !hasFullAccess && period === "y10" ? "y5" : period;
  const customIsActive = hasFullAccess && customActive;
  const months = Math.min(periodMonths(safePeriod), maxMonths);

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
        benchmark: mergedData.benchmark.closes,
        selected,
        weights,
        mode,
        capital,
        initialDeposit,
        contribution,
        frequency,
        months,
        startDate: customIsActive ? customStart : null,
        endDate: customIsActive ? customEnd : null,
      }),
    [
      mergedData.dates,
      mergedData.series,
      mergedData.benchmark.closes,
      selected,
      weights,
      mode,
      capital,
      initialDeposit,
      contribution,
      frequency,
      months,
      customIsActive,
      customStart,
      customEnd,
    ]
  );

  // Publish the live simulator state so the AI drawer can diagnose the exact
  // holdings, weights and backtest metrics the user is looking at.
  useEffect(() => {
    setAiSimulator({
      mode,
      period: PERIOD_LABEL[safePeriod],
      months,
      capital,
      initialDeposit,
      contribution: mode === "dca" ? contribution : undefined,
      frequency: mode === "dca" ? frequency : undefined,
      startDate: customIsActive ? customStart : null,
      endDate: customIsActive ? customEnd : null,
      holdings: selected.map((symbol, index) => ({
        symbol,
        weight: displayPcts[index] ?? 0,
      })),
      invested: result?.invested,
      finalValue: result?.finalValue,
      totalReturn: result?.totalReturn,
      maxDrawdown: result?.maxDrawdown,
      cagr: result?.cagr ?? null,
      benchmark: "S&P 500",
    });
  }, [
    capital,
    contribution,
    customEnd,
    customIsActive,
    customStart,
    displayPcts,
    frequency,
    initialDeposit,
    mode,
    months,
    result,
    safePeriod,
    selected,
  ]);

  useEffect(() => () => setAiSimulator(null), []);

  const chartData = useMemo(() => {
    if (!result) return null;
    const labels = result.curve.map((point) => point.month);

    if (mode === "lump") {
      return {
        labels,
        primary: result.curve.map((point) => point.value),
        secondary: result.benchmarkCurve,
        tertiary: undefined,
        mode: "value" as const,
        legendPrimary: t.legendPortfolio,
        legendSecondary: t.legendBenchmark,
        legendTertiary: undefined,
      };
    }

    return {
      labels,
      primary: result.curve.map((point) => point.value),
      secondary: result.benchmarkCurve,
      tertiary: result.curve.map((point) => point.invested),
      mode: "value" as const,
      legendPrimary: t.legendValue,
      legendSecondary: t.legendBenchmark,
      legendTertiary: "Principal",
    };
  }, [result, mode, t.legendPortfolio, t.legendBenchmark, t.legendValue]);

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

  const isDca = mode === "dca";
  const stats = [
    {
      label: isDca ? "Total Invested" : t.invested,
      value: `$${fmtMoney(invested)}`,
      tone: "text-slate-200",
    },
    {
      label: isDca ? "Final Value" : t.finalValueLabel,
      value: `$${fmtMoney(finalValue)}`,
      tone: "text-white",
    },
    {
      label: isDca ? "Net Profit" : t.returnLabel,
      value: result
        ? isDca
          ? `${result.netProfit >= 0 ? "+" : "-"}$${fmtMoney(
              Math.abs(result.netProfit)
            )} (${fmtPct(result.totalReturn)})`
          : fmtPct(result.totalReturn)
        : "—",
      tone: result
        ? retColor(isDca ? result.netProfit : totalReturn)
        : "text-slate-400",
    },
    {
      label: isDca ? "Max Drawdown" : t.drawdownLabel,
      value: result ? `-${maxDrawdown.toFixed(1)}%` : "—",
      tone: "text-rose-400",
    },
    {
      label: isDca ? "CAGR" : t.cagr,
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
          <>
            <label className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-slate-500">
              <span className="whitespace-nowrap">Initial Deposit</span>
              <span className="text-slate-300">$</span>
              <input
                type="number"
                min={0}
                step={500}
                value={initialDeposit}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value) && value >= 0) {
                    setInitialDeposit(Math.round(value));
                  }
                }}
                className="w-24 min-w-0 bg-transparent text-right text-sm tabular-nums text-slate-200 outline-none"
                aria-label="Initial Deposit"
              />
            </label>
            <div className="min-w-0">
              <MonthlyControl
                label="Recurring Amount"
                value={contribution}
                onChange={setContribution}
                min={MIN_MONTHLY}
                max={MAX_MONTHLY}
                step={50}
              />
            </div>
          </>
        )}

        <div className="min-w-0">
          <PeriodTabs
            lang={lang}
            value={safePeriod}
            onChange={(key) => {
              setPeriod(key);
              setCustomActive(false);
            }}
            maxMonths={maxMonths}
            hasFullAccess={hasFullAccess}
            onUpgrade={() => setUpgradeOpen(true)}
            custom={{
              active: customIsActive,
              locked: !hasFullAccess,
              onSelect: () => setCustomActive(true),
              onUpgrade: () => setUpgradeOpen(true),
            }}
          />
        </div>

        {mode === "dca" && (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-500">Frequency</span>
            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] p-0.5">
              {(
                [
                  { key: "weekly", label: "Weekly" },
                  { key: "biweekly", label: "Bi-weekly" },
                  { key: "monthly", label: "Monthly" },
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

      {hasFullAccess && (
        <div
          className={`grid overflow-hidden transition-all duration-300 ease-out ${
            customIsActive
              ? "mt-3 grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
        <div className="min-h-0">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="flex flex-wrap items-end gap-2.5">
              <label className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-slate-500">
                <span className="whitespace-nowrap">Start Date</span>
                <input
                  type="date"
                  value={customStart}
                  min={earliestHistoryDate}
                  max={customEnd || latestHistoryDate}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (!next) return;
                    setCustomStart(
                      next < earliestHistoryDate
                        ? earliestHistoryDate
                        : next > customEnd
                          ? customEnd
                          : next
                    );
                  }}
                  className="bg-transparent text-xs text-slate-200 outline-none [color-scheme:dark]"
                  aria-label="Start Date"
                />
              </label>
              <label className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-slate-500">
                <span className="whitespace-nowrap">End Date</span>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart}
                  max={latestHistoryDate}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (!next) return;
                    setCustomEnd(
                      next > latestHistoryDate
                        ? latestHistoryDate
                        : next < customStart
                          ? customStart
                          : next
                    );
                  }}
                  className="bg-transparent text-xs text-slate-200 outline-none [color-scheme:dark]"
                  aria-label="End Date"
                />
              </label>
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-slate-600">
                  Scenarios
                </span>
                {CUSTOM_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.key}
                    type="button"
                    onClick={() => {
                      const start =
                        scenario.start < earliestHistoryDate
                          ? earliestHistoryDate
                          : scenario.start;
                      const end = scenario.end
                        ? scenario.end > latestHistoryDate
                          ? latestHistoryDate
                          : scenario.end
                        : latestHistoryDate;
                      setCustomStart(start);
                      setCustomEnd(end < start ? start : end);
                      setCustomActive(true);
                    }}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-slate-400 transition hover:border-purple-400/35 hover:bg-purple-500/10 hover:text-white"
                  >
                    <span className="font-medium">{scenario.label}</span>
                    <span className="ml-1 text-slate-600">
                      {scenario.range}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

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
              <div className="text-right">
                <p className="tabular-nums text-slate-600">
                  {result.days} {t.days} · {result.startDate} →{" "}
                  {result.endDate}
                </p>
                {result.adjustedStart && (
                  <p className="mt-0.5 text-[10px] text-amber-300/80">
                    Start date adjusted to {result.startDate} due to asset
                    listing history
                  </p>
                )}
                {result.excludedSymbols.length > 0 && (
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    No price history for {result.excludedSymbols.join(", ")} in
                    this range.
                  </p>
                )}
              </div>
            </div>
            {chartData && (
              <SimulatorChart
                labels={chartData.labels}
                primary={chartData.primary}
                secondary={chartData.secondary}
                tertiary={chartData.tertiary}
                mode={chartData.mode}
                legendPrimary={chartData.legendPrimary}
                legendSecondary={chartData.legendSecondary}
                legendTertiary={chartData.legendTertiary}
                ariaLabel={t.chartTitleSim}
              />
            )}
          </div>
        </>
      ) : (
        <p className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm text-slate-500">
          {selected.length > 0
            ? "No overlapping price history for this date range."
            : t.empty}
        </p>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-slate-600">
        {t.statsNote}
        <br />
        {t.disclaimer}
      </p>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        lang={lang}
        source="simulator-custom-range"
      />
    </article>
  );
}
