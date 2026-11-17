// Unified backtest engine for the merged Simulator.
//
// Both modes consume the same daily close matrix, the same selected symbols
// and the same purple weight sliders. Lump Sum invests the starting capital on
// day one; DCA adds the contribution at the chosen cadence. The chart consumes
// `month/value/invested`, which mirrors the DCA engine's point shape so the
// existing sampling + morph helpers can be reused unchanged.

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
  invested: number;
  finalValue: number;
  totalReturn: number;
  maxDrawdown: number;
  cagr: number | null;
  days: number;
  contributions: number;
  startDate: string;
  endDate: string;
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
function priceAt(series: number[], index: number): number {
  for (let i = index; i >= 0; i -= 1) {
    const value = series[i];
    if (Number.isFinite(value) && value > 0) return value;
  }
  return NaN;
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
  selected,
  weights,
  mode,
  capital,
  contribution,
  frequency,
  months,
}: {
  dates: string[];
  series: Record<string, number[]>;
  selected: string[];
  weights: Record<string, number>;
  mode: SimMode;
  capital: number;
  contribution: number;
  frequency: SimFrequency;
  months: number;
}): SimResult | null {
  if (dates.length < 2 || selected.length === 0) return null;

  const windowLength = Math.max(2, Math.min(dates.length, Math.round(months * TRADING_DAYS_PER_MONTH)));
  const start = dates.length - windowLength;
  const windowDates = dates.slice(start);

  const eligible = selected
    .map((symbol) => {
      const full = series[symbol];
      if (!full || full.length !== dates.length) return null;
      const sliced = full.slice(start);
      if (!Number.isFinite(sliced[0]) || !(sliced[0] > 0)) return null;
      const weight = Math.max(0, weights[symbol] ?? 0);
      return { symbol, values: sliced, weight };
    })
    .filter((item): item is { symbol: string; values: number[]; weight: number } => item !== null);

  if (eligible.length === 0) return null;

  const totalWeight = eligible.reduce((sum, item) => sum + item.weight, 0);
  const normalized = eligible.map((item) => ({
    ...item,
    weight: totalWeight > 0 ? item.weight / totalWeight : 1 / eligible.length,
  }));

  const flows: Flow[] = [];
  const curve: SimPoint[] = [];

  if (mode === "lump") {
    const amount = Math.max(1, capital);
    flows.push({ date: windowDates[0], amount });
    const units = normalized.map((item) => {
      const base = priceAt(item.values, 0);
      return base > 0 ? (amount * item.weight) / base : 0;
    });

    for (let i = 0; i < windowDates.length; i += 1) {
      let value = 0;
      for (let j = 0; j < normalized.length; j += 1) {
        const price = priceAt(normalized[j].values, i);
        if (Number.isFinite(price)) value += units[j] * price;
      }
      curve.push({ month: windowDates[i], value, invested: amount });
    }
  } else {
    const amount = Math.max(1, contribution);
    const units = normalized.map(() => 0);
    let invested = 0;

    for (let i = 0; i < windowDates.length; i += 1) {
      if (contributionDue(i, windowDates, frequency)) {
        for (let j = 0; j < normalized.length; j += 1) {
          const price = priceAt(normalized[j].values, i);
          if (price > 0) units[j] += (amount * normalized[j].weight) / price;
        }
        invested += amount;
        flows.push({ date: windowDates[i], amount });
      }

      let value = 0;
      for (let j = 0; j < normalized.length; j += 1) {
        const price = priceAt(normalized[j].values, i);
        if (Number.isFinite(price)) value += units[j] * price;
      }
      curve.push({ month: windowDates[i], value, invested });
    }
  }

  const invested = curve.at(-1)?.invested ?? 0;
  const finalValue = curve.at(-1)?.value ?? 0;
  if (!(invested > 0)) return null;

  let peak = -Infinity;
  let maxDrawdown = 0;
  for (const point of curve) {
    peak = Math.max(peak, point.value);
    if (peak > 0) {
      maxDrawdown = Math.max(maxDrawdown, (peak - point.value) / peak);
    }
  }

  const endDate = windowDates.at(-1) ?? windowDates[0];
  return {
    curve,
    invested,
    finalValue,
    totalReturn: finalValue / invested - 1,
    maxDrawdown,
    cagr: moneyWeightedReturn(flows, finalValue, endDate),
    days: windowDates.length,
    contributions: flows.length,
    startDate: windowDates[0],
    endDate,
  };
}