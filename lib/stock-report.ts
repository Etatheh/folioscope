// Shared types for the AI stock fundamental report.
// Kept free of server-only imports so the client modal can reuse them.

export type BilingualText = {
  zh: string;
  en: string;
};

export type BilingualList = {
  zh: string[];
  en: string[];
};

export type EpsQuarter = {
  /** Fiscal quarter label, e.g. "4Q2025" or the Yahoo date label. */
  period: string;
  actual: number | null;
  estimate: number | null;
  surprisePct: number | null;
};

export type StockFinancials = {
  symbol: string;
  currency: string;
  /** Latest price used by Yahoo Finance, when available. */
  price: number | null;
  marketCap: number | null;
  revenue: number | null;
  /** Year-over-year revenue growth as a fraction (0.12 = 12%). */
  revenueGrowth: number | null;
  /** Gross margin as a fraction. */
  grossMargin: number | null;
  freeCashflow: number | null;
  pe: number | null;
  forwardPe: number | null;
  pb: number | null;
  epsTrailing: number | null;
  week52Low: number | null;
  week52High: number | null;
  /** Most recent four reported quarters, oldest first. */
  epsQuarters: EpsQuarter[];
  analyst: {
    targetMeanPrice: number | null;
    recommendationKey: string | null;
    numberOfAnalystOpinions: number | null;
  };
  /** ISO timestamp of the Yahoo Finance fetch. */
  asOf: string;
};

export type StockReport = {
  summary: BilingualText;
  highlights: BilingualList;
  valuation: BilingualText;
  risks: BilingualList;
  verdict: BilingualText;
};

export type StockReportResult = {
  symbol: string;
  report: StockReport;
  financials: StockFinancials;
  model: string;
  generatedAt: string;
  expiresAt: string;
};

export type StockReportApiSuccess = StockReportResult & {
  ok: true;
  cached: boolean;
};

export type StockReportApiFailure = {
  ok: false;
  error: string;
  code?: string;
};

export type StockReportApiResponse = StockReportApiSuccess | StockReportApiFailure;

/** Yahoo data and the generated report stay warm for 24 hours. */
export const STOCK_REPORT_TTL_MS = 24 * 60 * 60 * 1000;