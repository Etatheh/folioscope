import "server-only";
import { computeDca } from "@/components/dca/engine";
import { computeSimulation } from "@/components/simulator/engine";
import { PLANS_CONFIG } from "@/config/plans";
import type { BlogBacktest, BlogPreset } from "@/lib/blog-backtests";
import { isFeaturedSymbol } from "@/lib/watchlist";
import { fetchYahooHistory } from "@/lib/yahoo-history";

// Use the same close field and provider for every leg. The Yahoo loader shares
// in-flight requests and caches successful history. It has no demo-data path.
export async function runBlogBacktest(preset: BlogPreset): Promise<BlogBacktest> {
  const selected = preset.mode === "portfolio" ? Object.keys(preset.weights) : [preset.ticker];
  const symbols = [...new Set([preset.benchmark, ...selected])];
  const months = preset.years * 12;
  const free = PLANS_CONFIG.free.limits;
  if (months > Math.min(60, free.backtestMonths) || !symbols.every(isFeaturedSymbol)) {
    throw new Error("Preset exceeds the public history limits");
  }
  const history = await Promise.all(symbols.map(symbol => fetchYahooHistory(symbol, free.historyBars)));
  const closes = Object.fromEntries(symbols.map((symbol, i) => [
    symbol, new Map(history[i].map(bar => [bar.date, bar.close])),
  ]));
  // End at the last completed calendar month. This excludes intraday candles
  // and ensures the monthly engine never buys at an unfinished month's close.
  const marketMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit",
  }).formatToParts();
  const year = Number(marketMonth.find(part => part.type === "year")?.value);
  const month = Number(marketMonth.find(part => part.type === "month")?.value);
  const end = new Date(Date.UTC(year, month - 1, 1));
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - months, 1));
  const from = start.toISOString().slice(0, 10);
  const until = end.toISOString().slice(0, 10);
  const dates = [...closes.SPY.keys()].filter(date => date >= from && date < until).sort();
  const monthEnds = new Map<string, string>();
  for (const date of dates) {
    if (!symbols.every(symbol => closes[symbol].has(date))) throw new Error("Missing common price");
    monthEnds.set(date.slice(0, 7), date);
  }
  const day = 86400000;
  // Reject truncated ranges and gaps larger than a US exchange holiday closure.
  if (monthEnds.size !== months || Date.parse(dates[0]) - +start > 7 * day ||
      +end - Date.parse(dates[dates.length - 1]) > 7 * day ||
      dates.some((date, i) => i > 0 && Date.parse(date) - Date.parse(dates[i - 1]) > 7 * day)) {
    throw new Error("Incomplete price history");
  }

  if (preset.mode === "portfolio") {
    const series = Object.fromEntries(symbols.map(symbol => [symbol, dates.map(date => closes[symbol].get(date)!)]));
    const result = computeSimulation({
      dates, series, selected, weights: preset.weights, benchmark: series[preset.benchmark],
      mode: "lump", capital: preset.capital, contribution: 0, frequency: "monthly", months,
      startDate: dates[0], endDate: dates.at(-1),
    });
    if (!result) throw new Error("Portfolio history unavailable");
    const benchmarkReturn = result.benchmarkCurve.at(-1)! / result.invested - 1;
    return { dates, portfolio: result.curve.map(point => point.value), benchmark: result.benchmarkCurve,
      totalReturn: result.totalReturn, maxDrawdown: result.maxDrawdown, excessReturn: result.totalReturn - benchmarkReturn };
  }

  const observations = [...monthEnds.values()];
  const monthly = (symbol: string) => observations.map(date => ({ month: date, close: closes[symbol].get(date)! }));
  const result = computeDca(monthly(preset.ticker), preset.monthlyAmount, months);
  const staged = preset.comparison === "lump";
  // For the windfall comparison the uninvested balance is already owned on
  // day one. For payroll DCA the account contains only money received so far.
  const portfolio = result.curve.map(point => point.value + (staged ? result.invested - point.invested : 0));
  const spy = monthly(preset.benchmark);
  let benchmark: number[];
  if (staged) {
    const lump = computeSimulation({
      dates: observations, series: { SPY: spy.map(point => point.close) },
      selected: ["SPY"], weights: { SPY: 100 }, capital: result.invested,
      mode: "lump", contribution: 0, frequency: "monthly", months,
    });
    if (!lump) throw new Error("Lump-sum history unavailable");
    benchmark = lump.curve.map(point => point.value);
  } else {
    benchmark = computeDca(spy, preset.monthlyAmount, months).curve.map(point => point.value);
  }
  let peak = 0;
  let maxDrawdown = 0;
  for (const value of portfolio) {
    peak = Math.max(peak, value);
    maxDrawdown = Math.max(maxDrawdown, 1 - value / peak);
  }
  return { dates: observations, portfolio, benchmark, totalReturn: result.totalReturn, maxDrawdown,
    excessReturn: result.totalReturn - (benchmark.at(-1)! / result.invested - 1) };
}
