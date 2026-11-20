import { FEATURED_SYMBOLS } from "@/lib/watchlist";
import { STOCK_REPORT_TTL_MS } from "@/lib/stock-report";

export type PlanId = "free" | "pro";
export type BillingCycle = "monthly" | "yearly";
type Lang = "en" | "zh";
type Localized = Record<Lang, string>;

// These are the existing board allowlists, separate from the simulator pool.
export const FREE_MARKET_SYMBOLS: Record<"us" | "cn" | "asia" | "europe", string[]> = {
  us: ["AAPL", "MSFT", "NVDA", "GOOGL"],
  cn: ["600519", "300750", "002594", "688981"],
  asia: ["7203", "6758", "9984", "7974"],
  europe: [],
};

type Limits = {
  backtestSymbols: readonly string[] | null;
  backtestMonths: number;
  historyBars: number;
  customBacktestRange: boolean;
  indexDcaMonths: number;
  aiQuestionsPerDay: number;
  // null means no daily/count cap is enforced; 0 means unavailable.
  aiReportsPerDay: number | null;
  watchlistEntries: number | null;
};

type PlanConfig = {
  id: PlanId;
  name: string;
  prices: Record<BillingCycle, number>;
  tagline: Localized;
  highlight: boolean;
  limits: Limits;
};

const free: PlanConfig = {
  id: "free", name: "Free", prices: { monthly: 0, yearly: 0 }, highlight: false,
  tagline: { en: "Curated market data and core backtesting", zh: "精选市场数据与基础回测" },
  limits: {
    backtestSymbols: FEATURED_SYMBOLS, backtestMonths: 60, historyBars: 1300,
    customBacktestRange: false, indexDcaMonths: 0, aiQuestionsPerDay: 5,
    aiReportsPerDay: 0, watchlistEntries: null,
  },
};

const pro: PlanConfig = {
  id: "pro", name: "Pro", prices: { monthly: 9.90, yearly: 79 }, highlight: true,
  tagline: { en: "Full-market search, extended backtests and AI reports", zh: "全市场搜索、长周期回测与 AI 财报" },
  limits: {
    backtestSymbols: null, backtestMonths: 120, historyBars: 3200,
    customBacktestRange: true, indexDcaMonths: 120, aiQuestionsPerDay: 200,
    aiReportsPerDay: null, watchlistEntries: null,
  },
};

type ComparisonRow = { id: string; label: Localized; free: Localized; pro: Localized };
const comparison: ComparisonRow[] = [
  { id: "markets", label: { en: "Market boards", zh: "市场看板" },
    free: { en: `${FREE_MARKET_SYMBOLS.us.length} stocks per stock board; all indices`, zh: `个股看板各 ${FREE_MARKET_SYMBOLS.us.length} 只；所有指数` },
    pro: { en: "All supported stocks and indices", zh: "所有支持的股票与指数" } },
  { id: "pool", label: { en: "Backtest & search pool", zh: "回测与搜索范围" },
    free: { en: `${FEATURED_SYMBOLS.length} curated stocks & ETFs`, zh: `${FEATURED_SYMBOLS.length} 个精选股票及 ETF` },
    pro: { en: "Full U.S. stock & ETF search", zh: "全美股及 ETF 搜索" } },
  { id: "history", label: { en: "Portfolio & DCA backtests", zh: "组合与定投回测" },
    free: { en: `Preset periods up to ${free.limits.backtestMonths / 12} years`, zh: `预设周期最长 ${free.limits.backtestMonths / 12} 年` },
    pro: { en: `Preset periods up to ${pro.limits.backtestMonths / 12} years`, zh: `预设周期最长 ${pro.limits.backtestMonths / 12} 年` } },
  { id: "custom", label: { en: "Custom backtest dates", zh: "自定义回测区间" },
    free: { en: "Preset periods", zh: "预设周期" }, pro: { en: "Custom date ranges", zh: "自定义日期" } },
  { id: "index-dca", label: { en: "Index DCA comparison card", zh: "指数定投对比卡片" },
    free: { en: "Preview only", zh: "仅预览" },
    pro: { en: `Up to ${pro.limits.indexDcaMonths / 12} years`, zh: `最长 ${pro.limits.indexDcaMonths / 12} 年` } },
  { id: "watchlist", label: { en: "Cloud watchlist", zh: "云端自选股" },
    free: { en: "No saved-entry cap; curated search", zh: "存储无数量上限；精选搜索" },
    pro: { en: "No saved-entry cap; full-market search", zh: "存储无数量上限；全市场搜索" } },
  { id: "reports", label: { en: "AI financial reports", zh: "AI 财报分析" },
    free: { en: "Not included", zh: "不包含" },
    pro: { en: `No daily cap; reports cached for ${STOCK_REPORT_TTL_MS / 3_600_000} hours`, zh: `无每日次数上限；研报缓存 ${STOCK_REPORT_TTL_MS / 3_600_000} 小时` } },
  { id: "summary", label: { en: "AI market summary", zh: "AI 市场摘要" },
    free: { en: "Preview only", zh: "仅预览" },
    pro: { en: "On demand; shares the AI assistant daily quota", zh: "按需生成；与 AI 助手共用每日额度" } },
  { id: "assistant", label: { en: "AI assistant", zh: "AI 助手" },
    free: { en: `${free.limits.aiQuestionsPerDay} questions / day`, zh: `${free.limits.aiQuestionsPerDay} 次 / 天` },
    pro: { en: `${pro.limits.aiQuestionsPerDay} questions / day`, zh: `${pro.limits.aiQuestionsPerDay} 次 / 天` } },
];

/** Client-safe source for display and enforcement. Admin bypasses remain in access.ts. */
export const PLANS_CONFIG = { free, pro, comparison } as const;

export function getComparisonRows(lang: Lang) {
  return PLANS_CONFIG.comparison.map(row => ({
    label: row.label[lang], free: row.free[lang], pro: row.pro[lang],
  }));
}

export function getPlanFeatures(id: PlanId, lang: Lang = "en") {
  return PLANS_CONFIG.comparison.map(row => `${row.label[lang]}: ${row[id][lang]}`);
}

export function getBillingCopy(id: PlanId, cycle: BillingCycle, lang: Lang = "en") {
  const amount = PLANS_CONFIG[id].prices[cycle];
  const price = `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
  const yearly = cycle === "yearly";
  const savings = Math.round((1 - pro.prices.yearly / (pro.prices.monthly * 12)) * 100);
  return {
    price,
    period: lang === "zh" ? (yearly ? "/ 年" : "/ 月") : (yearly ? "/ year" : "/ month"),
    label: lang === "zh" ? (yearly ? "年付" : "月付") : (yearly ? "Yearly" : "Monthly"),
    note: `${price}/${yearly ? "yr" : "mo"}${id === "pro" && yearly ? ` · ${lang === "zh" ? "节省" : "Save "}${savings}%` : ""}`,
  };
}
