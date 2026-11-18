// Unified backtest engine for the merged Simulator.
//
// Both modes consume the same daily close matrix, the same selected symbols
// and the same purple weight sliders. Lump Sum invests the starting capital on
// day one; DCA adds an optional initial deposit and recurring contributions at
// the chosen cadence. The chart consumes `month/value/invested`, plus an
// optional S&P 500 mirror curve, so the existing custom drawing code stays in
// charge of all visuals.

export type SimMode = "lump" | "dca";
export type SimFrequency = "weekly" | "biweekly" | "monthly";

export type SimPoint = {
  /** Trading-day label (YYYY-MM-DD); named `month` to match DcaCurvePoint. */
  month: string;
  value: number;
  invested: number;
};

export type SimResult = {
  curve: SimPoint[];
  /** S&P 500 mirror of the same cash flows (dollar value per trading day). */
  benchmarkCurve: number[];
  invested: number;
  finalValue: number;
  netProfit: number;
  totalReturn: number;
  maxDrawdown: number;
  cagr: number | null;
  days: number;
  contributions: number;
  startDate: string;
  endDate: string;
  /** Full-history indices used to slice the chart series. */
  startIndex: number;
  endIndex: number;
  /** The range the user asked for, before listing-date alignment. */
  requestedStartDate: string;
  /** True when one or more selected assets listed after the requested start. */
  adjustedStart: boolean;
  /** Selected symbols that had no usable price inside the requested range. */
  excludedSymbols: string[];
};

type Flow = { date: string; amount: number };

const TRADING_DAYS_PER_MONTH = 21;
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

function contributionDue(
  index: number,
  dates: string[],
  frequency: SimFrequency
): boolean {
  if (index === 0) return true;
  if (frequency === "weekly") return index % 5 === 0;
  if (frequency === "biweekly") return index % 10 === 0;
  return dates[index].slice(0, 7) !== dates[index - 1].slice(0, 7);
}

/** Last known finite price at or before `index`, or NaN when none exists. */
function priceAt(series: readonly number[], index: number): number {
  for (let i = index; i >= 0; i -= 1) {
    const value = series[i];
    if (Number.isFinite(value) && value > 0) return value;
  }
  return NaN;
}

function firstIndexAtOrAfter(dates: string[], date: string): number {
  for (let i = 0; i < dates.length; i += 1) {
    if (dates[i] >= date) return i;
  }
  return -1;
}

function lastIndexAtOrBefore(dates: string[], date: string): number {
  for (let i = dates.length - 1; i >= 0; i -= 1) {
    if (dates[i] <= date) return i;
  }
  return -1;
}

function moneyWeightedReturn(
  flows: Flow[],
  finalValue: number,
  endDate: string
): number | null {
  if (flows.length === 0 || !(finalValue > 0)) return null;
  const start = Date.parse(flows[0].date);
  const end = Date.parse(endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  const years = (date: string) => (Date.parse(date) - start) / MS_PER_YEAR;

  const npv = (rate: number) => {
    const base = 1 + rate;
    let value = 0;
    for (const flow of flows) {
      value -= flow.amount / Math.pow(base, years(flow.date));
    }
    return value + finalValue / Math.pow(base, years(endDate));
  };

  let low = -0.9999;
  let high = 1;
  const lowValue = npv(low);
  let highValue = npv(high);
  while (highValue > 0 && high < 10_000) {
    high *= 2;
    highValue = npv(high);
  }
  if (
    !Number.isFinite(lowValue) ||
    !Number.isFinite(highValue) ||
    lowValue <= 0 ||
    highValue >= 0
  ) {
    return null;
  }
  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    if (npv(mid) > 0) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

export function computeSimulation({
  dates,
  series,
  benchmark,
  selected,
  weights,
  mode,
  capital,
  initialDeposit = 0,
  contribution,
  frequency,
  months,
  startDate = null,
  endDate = null,
}: {
  dates: string[];
  series: Record<string, number[]>;
  benchmark?: readonly number[];
  selected: string[];
  weights: Record<string, number>;
  mode: SimMode;
  /** Lump-sum starting capital. */
  capital: number;
  /** DCA initial deposit; zero is valid. */
  initialDeposit?: number;
  /** DCA recurring contribution. */
  contribution: number;
  frequency: SimFrequency;
  /** Period fallback when no custom range is supplied. */
  months: number;
  /** Inclusive custom range (YYYY-MM-DD). Null for preset periods. */
  startDate?: string | null;
  endDate?: string | null;
}): SimResult | null {
  if (dates.length < 2 || selected.length === 0) return null;

  const requestedStartIndex =
    startDate !== null && startDate !== ""
      ? firstIndexAtOrAfter(dates, startDate)
      : Math.max(
          0,
          dates.length -
            Math.min(
              dates.length,
              Math.round(months * TRADING_DAYS_PER_MONTH)
            )
        );
  const requestedEndIndex =
    endDate !== null && endDate !== ""
      ? lastIndexAtOrBefore(dates, endDate)
      : dates.length - 1;

  if (
    requestedStartIndex < 0 ||
    requestedEndIndex < 0 ||
    requestedStartIndex > requestedEndIndex
  ) {
    return null;
  }

  // Align the actual start to the first day on which every selected asset has
  // a valid close. This is what makes ranges that begin before PLTR/COIN IPOs
  // work without dropping assets or producing NaNs.
  const candidates = selected
    .map((symbol) => {
      const full = series[symbol];
      if (!full || full.length !== dates.length) return null;
      let firstValid = -1;
      for (let i = requestedStartIndex; i <= requestedEndIndex; i += 1) {
        const value = full[i];
        if (Number.isFinite(value) && value > 0) {
          firstValid = i;
          break;
        }
      }
      if (firstValid < 0) return null;
      const weight = Math.max(0, weights[symbol] ?? 0);
      return { symbol, full, weight, firstValid };
    })
    .filter(
      (
        item
      ): item is {
        symbol: string;
        full: number[];
        weight: number;
        firstValid: number;
      } => item !== null
    );

  if (candidates.length === 0) return null;

  const excludedSymbols = selected.filter(
    (symbol) => !candidates.some((candidate) => candidate.symbol === symbol)
  );
  const alignedStartIndex = Math.max(
    ...candidates.map((candidate) => candidate.firstValid)
  );
  if (alignedStartIndex > requestedEndIndex) return null;

  const windowDates = dates.slice(alignedStartIndex, requestedEndIndex + 1);
  if (windowDates.length < 2) return null;

  const eligible = candidates.map((candidate) => ({
    symbol: candidate.symbol,
    values: candidate.full.slice(alignedStartIndex, requestedEndIndex + 1),
    weight: candidate.weight,
  }));
  const totalWeight = eligible.reduce((sum, item) => sum + item.weight, 0);
  const normalized = eligible.map((item) => ({
    ...item,
    weight: totalWeight > 0 ? item.weight / totalWeight : 1 / eligible.length,
  }));

  const benchmarkSlice = benchmark
    ? benchmark.slice(alignedStartIndex, requestedEndIndex + 1)
    : [];

  const flows: Flow[] = [];
  const curve: SimPoint[] = [];
  const benchmarkCurve: number[] = [];

  if (mode === "lump") {
    const amount = Math.max(1, capital);
    flows.push({ date: windowDates[0], amount });
    const units = normalized.map((item) => {
      const base = priceAt(item.values, 0);
      return base > 0 ? (amount * item.weight) / base : 0;
    });
    const benchmarkBase = priceAt(benchmarkSlice, 0);
    const benchmarkUnits =
      Number.isFinite(benchmarkBase) && benchmarkBase > 0
        ? amount / benchmarkBase
        : 0;

    for (let i = 0; i < windowDates.length; i += 1) {
      let value = 0;
      for (let j = 0; j < normalized.length; j += 1) {
        const price = priceAt(normalized[j].values, i);
        if (Number.isFinite(price)) value += units[j] * price;
      }
      curve.push({ month: windowDates[i], value, invested: amount });

      const benchmarkPrice = priceAt(benchmarkSlice, i);
      benchmarkCurve.push(
        benchmarkUnits > 0 && Number.isFinite(benchmarkPrice)
          ? benchmarkUnits * benchmarkPrice
          : NaN
      );
    }
  } else {
    const initial = Math.max(0, initialDeposit);
    const recurring = Math.max(0, contribution);
    const units = normalized.map(() => 0);
    let benchmarkUnits = 0;
    let invested = 0;

    const buy = (amount: number, index: number) => {
      if (!(amount > 0)) return false;
      let bought = false;
      for (let j = 0; j < normalized.length; j += 1) {
        const price = priceAt(normalized[j].values, index);
        if (price > 0) {
          units[j] += (amount * normalized[j].weight) / price;
          bought = true;
        }
      }
      const benchmarkPrice = priceAt(benchmarkSlice, index);
      if (Number.isFinite(benchmarkPrice) && benchmarkPrice > 0) {
        benchmarkUnits += amount / benchmarkPrice;
      }
      invested += amount;
      flows.push({ date: windowDates[index], amount });
      return bought;
    };

    // Initial deposit goes in on day one. When it is present, recurring
    // contributions start at the next cadence instead of double-buying on
    // the first day; a pure zero-deposit DCA still buys at the start.
    if (initial > 0) buy(initial, 0);

    for (let i = 0; i < windowDates.length; i += 1) {
      const due =
        contributionDue(i, windowDates, frequency) &&
        !(i === 0 && initial > 0) &&
        recurring > 0;
      if (due) buy(recurring, i);

      let value = 0;
      for (let j = 0; j < normalized.length; j += 1) {
        const price = priceAt(normalized[j].values, i);
        if (Number.isFinite(price)) value += units[j] * price;
      }
      curve.push({ month: windowDates[i], value, invested });

      const benchmarkPrice = priceAt(benchmarkSlice, i);
      benchmarkCurve.push(
        benchmarkUnits > 0 && Number.isFinite(benchmarkPrice)
          ? benchmarkUnits * benchmarkPrice
          : NaN
      );
    }
  }

  const invested = curve.at(-1)?.invested ?? 0;
  const finalValue = curve.at(-1)?.value ?? 0;
  if (!(invested > 0) || !Number.isFinite(finalValue)) return null;

  let peak = -Infinity;
  let maxDrawdown = 0;
  for (const point of curve) {
    peak = Math.max(peak, point.value);
    if (peak > 0) {
      maxDrawdown = Math.max(maxDrawdown, (peak - point.value) / peak);
    }
  }

  const effectiveStartDate = windowDates[0];
  const effectiveEndDate = windowDates.at(-1) ?? windowDates[0];
  const requestedStartDate =
    startDate !== null && startDate !== ""
      ? startDate
      : (dates[requestedStartIndex] ?? effectiveStartDate);

  return {
    curve,
    benchmarkCurve,
    invested,
    finalValue,
    netProfit: finalValue - invested,
    totalReturn: finalValue / invested - 1,
    maxDrawdown,
    cagr: moneyWeightedReturn(flows, finalValue, effectiveEndDate),
    days: windowDates.length,
    contributions: flows.length,
    startDate: effectiveStartDate,
    endDate: effectiveEndDate,
    startIndex: alignedStartIndex,
    endIndex: requestedEndIndex,
    requestedStartDate,
    adjustedStart: alignedStartIndex > requestedStartIndex,
    excludedSymbols,
  };
}