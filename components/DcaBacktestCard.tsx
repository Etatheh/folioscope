"use client";

import { useEffect, useMemo, useState } from "react";

import { dict, type Lang } from "@/lib/i18n";
import type { ChatDcaContext } from "@/lib/chat";
import { setAiDca } from "@/lib/ai-context-store";
import { hasFullDashboardAccess, type ViewerPlan } from "@/lib/access";
import { useViewerPlan } from "@/lib/use-profile";
import type { DcaDataset, DcaTarget } from "@/lib/dca";
import ProBadge from "./ui/ProBadge";
import ProUpgradeButton from "./ui/ProUpgradeButton";
import DcaChart from "./dca/DcaChart";
import MonthlyControl from "./dca/MonthlyControl";
import PeriodTabs from "./dca/PeriodTabs";
import {
  DEFAULT_PERIOD,
  buildSamples,
  computeDca,
  fmtMoney,
  fmtPct,
  periodMonths,
  type PeriodKey,
} from "./dca/engine";
import { useAnimatedNumber, useMorphSeries } from "./dca/hooks";

const MIN_MONTHLY = 100;
const MAX_MONTHLY = 2000;
const STEP = 50;

/**
 * Multi-period dollar-cost-averaging backtest with a target switch
 * (S&P 500 vs Nasdaq 100) and the other index drawn as a live comparison.
 *
 * The server supplies up to 120 month-end closes per index; the client slices
 * any period (6M–10Y), recomputes both compound trajectories and morphs the SVG
 * curve with a liquid ease-out. Free / anonymous visitors get the same card
 * with a blurred readout and the upgrade dialog one click away.
 */
export default function DcaBacktestCard({
  lang,
  plan,
  dataset,
}: {
  lang: Lang;
  plan: ViewerPlan;
  dataset: DcaDataset;
}) {
  const t = dict[lang].dca;
  const effectivePlan = useViewerPlan(plan);
  const hasFullAccess = hasFullDashboardAccess(effectivePlan);
  const [period, setPeriod] = useState<PeriodKey>(DEFAULT_PERIOD);
  const [monthly, setMonthly] = useState(500);
  const [target, setTarget] = useState<DcaTarget>(
    dataset.sp500.points.length > 0 ? "sp500" : "nasdaq",
  );

  const active = dataset[target];
  const altKey: DcaTarget = target === "sp500" ? "nasdaq" : "sp500";
  const alt = dataset[altKey];
  const activeName = lang === "zh" ? active.name : active.nameEn;
  const altName = lang === "zh" ? alt.name : alt.nameEn;

  const hasData = active.dataState !== "unavailable" && active.points.length > 0;
  const altHasData = alt.points.length > 0;
  const maxMonths = Math.min(
    active.points.length || periodMonths(DEFAULT_PERIOD),
    altHasData ? alt.points.length : Infinity,
  );
  const months = Math.min(periodMonths(period), maxMonths);

  const stats = useMemo(
    () => computeDca(active.points, monthly, months),
    [active.points, monthly, months],
  );
  const altStats = useMemo(
    () => computeDca(altHasData ? alt.points : active.points, monthly, months),
    [alt.points, altHasData, active.points, monthly, months],
  );
  // y-domain evaluated at the slider MAX so it never tracks the current
  // contribution; dragging the slider then visibly lifts / drops the curves.
  const domainMax = useMemo(() => {
    const refA = computeDca(active.points, MAX_MONTHLY, months);
    const refB = computeDca(altHasData ? alt.points : active.points, MAX_MONTHLY, months);
    return Math.max(refA.finalValue, refB.finalValue, refA.invested, 1);
  }, [active.points, alt.points, altHasData, months]);
  const samplesTarget = useMemo(
    () => buildSamples(stats.curve, altStats.curve, domainMax),
    [stats, altStats, domainMax],
  );
  const anim = useMorphSeries(samplesTarget);

  const invested = useAnimatedNumber(stats.invested);
  const finalValue = useAnimatedNumber(stats.finalValue);
  const totalReturn = useAnimatedNumber(stats.totalReturn);
  const xirr = useAnimatedNumber(stats.xirr ?? 0);

  const periodLabel = t.periods[period];
  const subtitle = hasData
    ? `${activeName} · ${periodLabel} · ${t.asOf} ${active.asOf ?? ""}`
    : activeName;

  const statsBlocks = [
    { label: t.invested, value: `$${fmtMoney(invested)}`, tone: "text-slate-200" },
    { label: t.finalValue, value: `$${fmtMoney(finalValue)}`, tone: "text-white" },
    {
      label: t.totalReturn,
      value: fmtPct(totalReturn),
      tone: stats.totalReturn >= 0 ? "text-emerald-400" : "text-rose-400",
    },
    {
      label: months < 12 ? `${t.xirr} ${t.xirrNote}` : t.xirr,
      value: stats.xirr === null ? "—" : fmtPct(xirr),
      tone: stats.xirr === null || stats.xirr >= 0 ? "text-emerald-400" : "text-rose-400",
    },
  ];

  // Publish the live plan to the AI assistant drawer. Locked users only share
  // the plan inputs — the blurred backtest results are never sent.
  const aiDca = useMemo<ChatDcaContext | null>(() => {
    if (!hasData) return null;
    return {
      target,
      targetName: activeName,
      period: periodLabel,
      months,
      monthly,
      benchmark: altName,
      ...(hasFullAccess
        ? {
            invested: stats.invested,
            finalValue: stats.finalValue,
            totalReturn: stats.totalReturn,
            xirr: stats.xirr,
          }
        : {}),
    };
  }, [
    activeName,
    altName,
    hasData,
    hasFullAccess,
    months,
    monthly,
    periodLabel,
    stats,
    target,
  ]);

  useEffect(() => {
    setAiDca(aiDca);
  }, [aiDca]);

  const targets: { key: DcaTarget; label: string; disabled: boolean }[] = [
    {
      key: "sp500",
      label: lang === "zh" ? "标普500" : "S&P 500",
      disabled: dataset.sp500.points.length === 0,
    },
    {
      key: "nasdaq",
      label: lang === "zh" ? "纳斯达克100" : "Nasdaq 100",
      disabled: dataset.nasdaq.points.length === 0,
    },
  ];

  return (
    <article className="data-card flex h-full flex-col rounded-2xl p-5 sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">
            {t.title}
            <span className="ml-2 align-middle text-xs font-normal text-slate-500">
              {subtitle}
            </span>
          </h2>
          <p className="mt-1 flex items-center gap-2 text-[11px] text-slate-600">
            <span>{hasData ? `${stats.months} ${t.months}` : t.unavailable}</span>
            {active.dataState === "stale" && (
              <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-300">
                {t.stale}
              </span>
            )}
          </p>
        </div>
        <ProBadge title={dict[lang].pro.badgeTip} />
      </header>

      {hasData ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-600">{t.target}</span>
            <div className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.03] p-0.5">
              {targets.map((opt) => {
                const selected = opt.key === target;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={!hasFullAccess || opt.disabled}
                    onClick={() => setTarget(opt.key)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                      selected
                        ? "bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-white ring-1 ring-purple-400/30"
                        : "text-slate-500 hover:text-slate-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <PeriodTabs
              lang={lang}
              value={period}
              onChange={setPeriod}
              maxMonths={Number.isFinite(maxMonths) ? maxMonths : active.points.length}
              disabled={!hasFullAccess}
            />
            <MonthlyControl
              label={t.monthly}
              value={monthly}
              onChange={setMonthly}
              min={MIN_MONTHLY}
              max={MAX_MONTHLY}
              step={STEP}
              disabled={!hasFullAccess}
            />
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
                    hasFullAccess ? "" : "blur-[5px] select-none"
                  }`}
                  aria-hidden={!hasFullAccess}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {block.value}
                </p>
              </div>
            ))}
          </div>

          <div className="relative mt-3 flex-1">
            <DcaChart
              lang={lang}
              anim={anim}
              curve={stats.curve}
              altCurve={altStats.curve}
              legendDca={activeName}
              benchmarkLabel={altName}
              dimmed={!hasFullAccess}
            />

            {!hasFullAccess && (
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
        </>
      ) : (
        <div className="mt-4 flex min-h-52 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
          <p className="text-sm font-medium text-slate-300">{t.unavailableTitle}</p>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">{t.unavailableBody}</p>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-slate-600">
        {t.assumptions}
        <br />
        {t.disclaimer}
      </p>
    </article>
  );
}