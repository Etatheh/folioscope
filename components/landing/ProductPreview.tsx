"use client";

import { useId, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useEntranceComplete } from "@/components/ui/Reveal";
import type { Lang } from "@/lib/i18n";
import styles from "./landing.module.css";

type TrendPoint = readonly [number, number];

// Illustrative, not market data. Uneven sampling and small plateaus keep the
// rhythm organic; the portfolio tracks its benchmark before compounding apart.
const sampleX = [0, 9, 21, 34, 45, 59, 70, 83, 98, 109, 121, 134, 146, 159, 174, 185, 197, 212, 223, 237, 249, 262, 275, 286, 300, 314, 325, 339, 351, 365, 379, 391, 400];
const marketY = [151, 150, 148, 149, 150, 148, 143, 138, 136, 138, 141, 140, 132, 125, 122, 123, 125, 124, 115, 104, 100, 103, 108, 106, 95, 83, 75, 72, 73, 69, 59, 55, 57];
const portfolioY = [166, 165, 164, 163, 162, 160, 158, 159, 157, 155, 153, 151, 150, 148, 145, 142, 140, 138, 135, 130, 124, 120, 122, 121, 115, 102, 90, 82, 78, 70, 55, 40, 32];
const benchmarkY = [166, 165, 164, 163, 162, 161, 159, 160, 158, 157, 156, 154, 153, 151, 149, 148, 146, 145, 143, 140, 136, 134, 136, 135, 131, 126, 121, 119, 117, 113, 110, 107, 105];

/** Shape-preserving cubic Hermite interpolation (PCHIP).
 * Weighted harmonic tangents respect unequal x spacing; zero tangents at
 * reversals round the turning points without inventing overshooting extrema.
 */
function monotonePath(points: readonly TrendPoint[]): string {
  const widths = points.slice(1).map((point, i) => point[0] - points[i][0]);
  const slopes = widths.map((width, i) => (points[i + 1][1] - points[i][1]) / width);
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === points.length - 1) return slopes[slopes.length - 1];
    const before = slopes[i - 1];
    const after = slopes[i];
    if (before * after <= 0) return 0;
    const w1 = 2 * widths[i] + widths[i - 1];
    const w2 = widths[i] + 2 * widths[i - 1];
    return (w1 + w2) / (w1 / before + w2 / after);
  });
  const format = (value: number) => Number(value.toFixed(3));
  return points.slice(1).reduce((path, [x, y], i) => {
    const [previousX, previousY] = points[i];
    const third = widths[i] / 3;
    return `${path} C${format(previousX + third)} ${format(previousY + third * tangents[i])} ${format(x - third)} ${format(y - third * tangents[i + 1])} ${x} ${y}`;
  }, `M${points[0][0]} ${points[0][1]}`);
}

// Build once at module scope, never during animation or on each render.
const curves = [marketY, portfolioY].map(values => monotonePath(sampleX.map((x, i) => [x, values[i]])));
const benchmarkCurve = monotonePath(sampleX.map((x, i) => [x, benchmarkY[i]]));

const chartEase = [0.16, 1, 0.3, 1] as const;

function PreviewTrend({ current, zh }: { current: number; zh: boolean }) {
  const id = useId().replace(/:/g, "");
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const entranceComplete = useEntranceComplete();
  const reduced = useReducedMotion();
  const endY = (current === 0 ? marketY : portfolioY)[sampleX.length - 1];
  const transition = { delay: reduced ? 0 : 0.2, duration: reduced ? 0 : 1.2, ease: chartEase };
  return <motion.svg ref={ref} viewBox="0 0 400 190" className={styles.demoChart} role="img"
    aria-label={zh ? "示例趋势示意图，非实时行情或实际回测收益" : "Illustrative trend, not live prices or actual backtest returns"}
    initial="hidden" animate={entranceComplete && inView ? "visible" : "hidden"}>
    <defs>
      <linearGradient id={`${id}-line`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="400" y2="0"><stop stopColor="#42b994"/><stop offset="1" stopColor="#74e5be"/></linearGradient>
      <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#34d399" stopOpacity=".15"/><stop offset=".55" stopColor="#34d399" stopOpacity=".025"/><stop offset="1" stopColor="#34d399" stopOpacity="0"/></linearGradient>
      <clipPath id={`${id}-reveal`} clipPathUnits="userSpaceOnUse">
        <motion.rect x="0" y="-12" width="414" height="214" className={styles.trendClip}
          style={{ originX: 0, originY: 0, transformBox: "view-box" }}
          variants={{ hidden: { scaleX: 0 }, visible: { scaleX: 1, transition } }} />
      </clipPath>
    </defs>
    {[30, 75, 120, 165].map(y => <path key={y} d={`M0 ${y}H400`} stroke="#ffffff" strokeOpacity=".04"/>)}
    {/* Only the clipping rectangle scales. Paths, dash spacing and fill stay intact. */}
    <motion.g clipPath={`url(#${id}-reveal)`} className={styles.trendPaths}
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition } }}>
      <path d={`${curves[current]} L400 190 H0 Z`} fill={`url(#${id}-fill)`}/>
      {current === 1 && <path d={benchmarkCurve} fill="none" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth="1.4" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>}
      <path d={curves[current]} fill="none" stroke={`url(#${id}-line)`} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
    </motion.g>
    <motion.g className={styles.trendEndpoint} variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: reduced ? 0 : 1.4, duration: reduced ? 0 : 0.35, ease: chartEase } } }}>
      <circle cx="400" cy={endY} r="6" fill="#34d399" fillOpacity=".16" className={styles.trendHalo}/>
      <circle cx="400" cy={endY} r="2" fill="#74e5be"/>
    </motion.g>
  </motion.svg>;
}

/** Hero overview: the complete workspace, without duplicating the story tabs. */
export function WorkspacePreview({ lang }: { lang: Lang }) {
  const zh = lang === "zh";
  const metrics = zh
    ? [["组合市值", "$128,450"], ["累计收益", "+12.8%"], ["最大回撤", "−8.4%"]]
    : [["Portfolio value", "$128,450"], ["Total return", "+12.8%"], ["Max drawdown", "−8.4%"]];
  return <div className={styles.preview} aria-label={zh ? "FolioScope 工作台全景预览" : "FolioScope workspace overview"}>
    <div className={styles.previewTop}><span className="font-semibold tracking-tight text-white">FolioScope<span className="ml-2 text-violet-300">/</span></span><span className={styles.demoLabel}>{zh ? "工作台预览 · 示例数据" : "Workspace preview · Illustrative data"}</span></div>
    <div className={styles.previewBody}>
      <aside className={styles.workspaceSidebar} aria-label={zh ? "工作台结构示意" : "Workspace structure illustration"}>
        <p className="mb-6 text-xs tracking-widest text-slate-500">WORKSPACE</p>
        {(zh ? ["总览", "全球市场", "投资组合", "AI 研究"] : ["Overview", "Global markets", "Portfolio", "AI research"]).map((label, i) => <span key={label} className={i === 0 ? styles.workspaceSelected : ""}>{label}</span>)}
        <p className="mt-auto pt-12 text-xs leading-6 text-slate-500">US<br />EUROPE<br />ASIA-PACIFIC</p>
      </aside>
      <div className={styles.workspaceContent}>
        <div className={styles.workspaceHeading}><div><p className="text-sm text-slate-400">{zh ? "你的研究工作空间" : "Your research workspace"}</p><h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">{zh ? "市场全景，研究一览。" : "A connected perspective."}</h3></div><span className="text-xs tracking-widest text-violet-300">OVERVIEW</span></div>
        <div className={styles.workspaceGrid}>
          <section className={styles.workspaceChart} aria-label={zh ? "组合与标普 500 趋势示例" : "Portfolio and S&P 500 trend illustration"}>
            <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="text-sm font-medium text-slate-200">{zh ? "组合与 S&P 500" : "Portfolio & S&P 500"}</h4><span className="rounded border border-white/10 px-2 py-1 text-xs text-slate-400">10Y</span></div>
            <div className={styles.workspaceLegend}><span><i className="bg-emerald-300" />{zh ? "组合" : "Portfolio"}</span><span><i className="bg-slate-400" />S&P 500</span></div>
            <PreviewTrend current={1} zh={zh} />
            <div className="flex justify-between font-mono text-xs text-slate-500"><span>2016</span><span>2021</span><span>2026</span></div>
            <div className={styles.workspaceMetrics}>{metrics.map(([label, value], i) => <div key={label}><p className="text-xs text-slate-500">{label}</p><p className={`mt-2 font-mono text-lg ${i === 1 ? "text-emerald-300" : "text-slate-200"}`}>{value}</p></div>)}</div>
          </section>
          <aside className={styles.workspaceReport} aria-label={zh ? "AI 研报摘要示例" : "AI report summary illustration"}>
            <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-violet-200">{zh ? "AI 研究摘要" : "AI research brief"}</span><span className="rounded border border-violet-400/20 px-2 py-1 text-xs text-violet-300">FolioScope AI</span></div>
            <p className="mt-5 text-lg font-medium leading-snug text-slate-200">{zh ? "透过数字，理解业务。" : "Beyond the numbers."}</p>
            <p className="mt-3 text-sm leading-7 text-slate-400">{zh ? "将财报重点、市场背景与组合风险，连接到同一个研究视角。" : "Connect financial filings, market context and portfolio risk in one research view."}</p>
            <div className="mt-6 space-y-5">{(zh ? [["财报重点", "收入增长、利润率与现金流。"], ["风险观察", "估值敏感性与持仓集中度。"], ["下一步研究", "对照历史财报，检验投资假设。"]] : [["Financial signals", "Revenue growth, margins and cash flow."], ["Risk in focus", "Valuation sensitivity and concentration."], ["Next in research", "Compare filings to test your thesis."]]).map(([title, text]) => <div key={title} className="border-t border-white/5 pt-4"><h4 className="text-xs font-medium text-slate-300">{title}</h4><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>)}</div>
          </aside>
        </div>
        <p className="mt-5 text-xs leading-6 text-slate-500">{zh ? "所有数值及摘要仅为功能示例，不代表实际行情、回测收益或投资建议。" : "Values and summaries are illustrative, not live prices, actual backtest returns or investment advice."}</p>
      </div>
    </div>
  </div>;
}

// Isolated illustrative UI: no quotes API, auth, or production chart dependencies.
export default function ProductPreview({ lang, active, onChange, compact = false }: {
  lang: Lang; active?: number; onChange?: (index: number) => void; compact?: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const current = active ?? selected;
  const id = useId().replace(/:/g, "");
  const zh = lang === "zh";
  const tabs = zh ? ["全球市场", "组合回测", "AI 财报"] : ["Markets", "Simulator", "AI Research"];
  return <div className={`${styles.preview} ${compact ? styles.compact : ""}`}>
    <div className={styles.previewTop}><span className="font-semibold tracking-tight text-white">FolioScope<span className="ml-2 text-violet-300">/</span></span><span className={styles.demoLabel}>{zh ? "交互预览 · 示例数据" : "Interactive preview · Illustrative data"}</span></div>
    <div className={styles.previewBody}>
      {!compact && <aside className={styles.previewSidebar}><span className="mb-8 block text-xs tracking-widest text-slate-500">WORKSPACE</span>{tabs.map((tab, i) => <button type="button" key={tab} onClick={() => onChange ? onChange(i) : setSelected(i)} aria-pressed={current === i} className={current === i ? styles.sideActive : ""}>{tab}</button>)}<div className="mt-auto pt-12 text-xs text-slate-500">{zh ? "你的研究，始终同步。" : "Your research, in sync."}</div></aside>}
      <div className={styles.previewContent}>
        <div className={styles.previewTabs} role="tablist" aria-label={zh ? "预览模式" : "Preview mode"}>{tabs.map((tab, i) => <button type="button" role="tab" id={`${id}-tab-${i}`} aria-controls={`${id}-panel`} aria-selected={current === i} tabIndex={current === i ? 0 : -1} key={tab} onClick={() => onChange ? onChange(i) : setSelected(i)} onKeyDown={(e) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
          e.preventDefault();
          const next = e.key === "Home" ? 0 : e.key === "End" ? 2 : (i + (e.key === "ArrowRight" ? 1 : 2)) % 3;
          if (onChange) onChange(next); else setSelected(next);
          document.getElementById(`${id}-tab-${next}`)?.focus();
        }}>{tab}</button>)}</div>
        <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${current}`} tabIndex={0} className={styles.demoPanel}>
          <div className="flex items-start justify-between gap-3"><div><p className="text-sm text-slate-400">{current === 0 ? (zh ? "全球市场总览" : "Global market overview") : current === 1 ? (zh ? "组合表现" : "Portfolio performance") : (zh ? "财报研究工作台" : "Financial report workspace")}</p><h3 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{current === 0 ? "S&P 500" : current === 1 ? (zh ? "时间，让策略更清晰。" : "A longer perspective.") : "FolioScope AI"}</h3></div><span className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-400">{current === 1 ? "10Y" : current === 0 ? "US / EU / APAC" : "RESEARCH"}</span></div>
          {current < 2 ? <>
            <div className="mt-7 flex flex-wrap gap-6 text-sm"><div><span className="text-slate-500">{zh ? "研究视角" : "Research view"}</span><p className="mt-1 text-emerald-300">{current === 0 ? (zh ? "指数与技术指标" : "Indices & technicals") : (zh ? "组合 / 基准 / 本金" : "Portfolio / benchmark / principal")}</p></div><div><span className="text-slate-500">{zh ? "策略" : "Strategy"}</span><p className="mt-1 text-slate-200">{current === 0 ? (zh ? "多市场观察" : "Multi-market") : "Lump Sum · DCA"}</p></div></div>
            <PreviewTrend key={current} current={current} zh={zh} />
            <div className="flex justify-between font-mono text-xs text-slate-500"><span>{current === 0 ? "US" : "2016"}</span><span>{current === 0 ? "EUROPE" : "2021"}</span><span>{current === 0 ? "ASIA-PACIFIC" : "2026"}</span></div>
          </> : <div className={styles.aiPreview}><p className="text-sm text-violet-300">{zh ? "财报解读" : "Earnings analysis"}</p>{(zh ? [["核心要点", "梳理收入增长、利润率与现金流。"], ["风险观察", "识别业务集中度与估值敏感因素。"], ["下一步研究", "对照历史财报，检验你的投资假设。"]] : [["Key takeaway", "Explore revenue growth, margins and cash flow."], ["Risk", "Examine concentration and valuation sensitivity."], ["Next action", "Compare historical filings to test your thesis."]]).map(([title, text]) => <div key={title} className="mt-5"><h4 className="text-sm font-medium text-slate-200">{title}</h4><p className="mt-1 text-sm leading-6 text-slate-400">{text}</p></div>)}</div>}
          <p className="mt-6 border-t border-white/5 pt-4 text-xs text-slate-500">{zh ? "仅作产品功能演示，不构成投资建议。" : "Product illustration only. Not investment advice."}</p>
        </div>
      </div>
    </div>
  </div>;
}
