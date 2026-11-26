import type { FeaturedSymbol } from "./watchlist";

type Years = 1 | 2 | 3 | 4 | 5;
type Preset = { title: string; years: Years; benchmark: "SPY" } & (
  | { mode: "dca"; ticker: FeaturedSymbol; monthlyAmount: number; comparison: "dca" | "lump" }
  | { mode: "portfolio"; weights: Partial<Record<FeaturedSymbol, number>>; capital: number }
);

export const blogPresets = {
  "qqq-dca": { title: "Monthly investing in QQQ and SPY", mode: "dca", ticker: "QQQ", monthlyAmount: 500, comparison: "dca", benchmark: "SPY", years: 5 },
  "spy-entry": { title: "One SPY budget, two entry schedules", mode: "dca", ticker: "SPY", monthlyAmount: 500, comparison: "lump", benchmark: "SPY", years: 5 },
  "qqq-growth": { title: "QQQ against the S&P 500", mode: "portfolio", weights: { QQQ: 100 }, capital: 10000, benchmark: "SPY", years: 5 },
  "tech-split": { title: "A tech-heavy portfolio against SPY", mode: "portfolio", weights: { SPY: 50, QQQ: 25, NVDA: 25 }, capital: 10000, benchmark: "SPY", years: 5 },
} as const satisfies Record<string, Preset>;

export type BlogPresetId = keyof typeof blogPresets;
export type BlogPreset = Preset;
export type BlogBacktest = {
  dates: string[];
  portfolio: number[];
  benchmark: number[];
  totalReturn: number;
  maxDrawdown: number;
  excessReturn: number;
};
