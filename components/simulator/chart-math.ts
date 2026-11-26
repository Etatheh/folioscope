/** Stable integer ticks on a 1 / 2 / 5 ladder, shared by grid and scale. */
export function niceValueDomain(values: number[], nonNegative = true) {
  let low = Infinity;
  let high = -Infinity;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    low = Math.min(low, value);
    high = Math.max(high, value);
  }
  if (!Number.isFinite(low)) { low = 0; high = 100; }
  const pad = Math.max((high - low) * 0.06, Math.abs(high) * 0.01, 1);
  const rawMin = nonNegative ? Math.max(0, low - pad) : low - pad;
  const rawMax = high + pad;
  const rough = (rawMax - rawMin) / 4;
  const power = 10 ** Math.floor(Math.log10(Math.max(1, rough)));
  const step = Math.max(1, ([1, 2, 5, 10].find((value) => value * power >= rough) ?? 10) * power);
  const min = Math.floor(rawMin / step) * step;
  const max = Math.max(min + step, Math.ceil(rawMax / step) * step);
  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => min + i * step);
  return { min, max, ticks, step };
}

export function valueAxisLabel(value: number) {
  const sign = value < 0 ? "−" : "";
  const abs = Math.abs(value);
  const compact = (n: number) => Number(n.toFixed(2)).toString();
  if (abs >= 1_000_000) return `${sign}$${compact(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}$${compact(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}
