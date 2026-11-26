/** Muted, distinct colors shared by chips, sliders and allocation sectors. */
export const ASSET_COLORS = [
  "#59C9A5", "#71B5E8", "#DBB76B", "#A89BE0", "#DD9185",
  "#69BCBD", "#B5C780", "#D79DBE", "#889ED1", "#C6AE91",
] as const;

/** Largest-remainder rounding keeps the displayed portfolio at exactly 100%. */
export function allocationPercentages(selected: string[], weights: Record<string, number>): number[] {
  if (!selected.length) return [];
  const basis = selected.map((symbol) => Math.max(0, weights[symbol] ?? 0));
  const sum = basis.reduce((total, value) => total + value, 0);
  const raw = basis.map((value) => sum > 0 ? value / sum * 100 : 100 / selected.length);
  const rounded = raw.map(Math.floor);
  const order = raw.map((value, index) => ({ index, fraction: value - rounded[index] }))
    .sort((a, b) => b.fraction - a.fraction);
  const remaining = 100 - rounded.reduce((total, value) => total + value, 0);
  for (let i = 0; i < remaining; i += 1) rounded[order[i].index] += 1;
  return rounded;
}

/** Set an actual percentage, redistributing the remainder across other assets. */
export function redistributeWeight(selected: string[], weights: Record<string, number>, symbol: string, value: number) {
  if (selected.length === 1) return { [symbol]: 100 };
  const target = Math.min(100, Math.max(0, Math.round(value)));
  const others = selected.filter((item) => item !== symbol);
  const sum = others.reduce((total, item) => total + Math.max(0, weights[item] ?? 0), 0);
  // Preserve precise ratios between untouched assets. Rounding at every key
  // press would gradually bias equal holdings during a long slider drag.
  return {
    ...Object.fromEntries(others.map((item) => [item, (100 - target) * (sum > 0 ? Math.max(0, weights[item] ?? 0) / sum : 1 / others.length)])),
    [symbol]: target,
  };
}
