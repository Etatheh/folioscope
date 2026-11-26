"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SimulatorChart from "@/components/simulator/SimulatorChart";
import { fmtMoney, fmtPct } from "@/components/dca/engine";
import { blogPresets, type BlogBacktest, type BlogPresetId } from "@/lib/blog-backtests";

export default function BlogBacktestEmbed({ preset }: { preset: BlogPresetId }) {
  const config = blogPresets[preset];
  const card = useRef<HTMLElement>(null);
  const [data, setData] = useState<BlogBacktest | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch(`/api/blog/backtests/${preset}`, { signal: controller.signal });
        if (!response.ok) throw new Error("History unavailable");
        setData(await response.json());
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    };
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        void load();
      }
    }, { rootMargin: "500px" });
    if (card.current) observer.observe(card.current);
    return () => { observer.disconnect(); controller.abort(); };
  }, [preset, attempt]);

  const dca = config.mode === "dca";
  const staged = dca && config.comparison === "lump";
  const allocation = dca ? `${config.ticker} DCA` : Object.entries(config.weights).map(([symbol, weight]) => `${weight}% ${symbol}`).join(" + ");
  const metrics = [
    ["Total Return", data && fmtPct(data.totalReturn)],
    ["Max Drawdown", data && `${data.maxDrawdown > 0 ? "−" : ""}${(100 * data.maxDrawdown).toFixed(1)}%`],
    ["vs. S&P 500", data && `${data.excessReturn >= 0 ? "+" : ""}${(100 * data.excessReturn).toFixed(1)} pp`],
  ];

  return <figure ref={card} aria-label={config.title} className="not-prose my-10 rounded-2xl border border-slate-700/80 bg-linear-to-br from-[#101c31] to-[#0a101d] p-4 text-slate-100 shadow-xl sm:p-7 [&_svg:focus-visible]:outline-2 [&_svg:focus-visible]:outline-violet-300">
    <figcaption className="text-xl font-semibold tracking-tight">{config.title}</figcaption>
    <p className="mt-2 text-sm text-slate-300">{config.years} years · {dca ? `$${fmtMoney(config.monthlyAmount)} per month` : `$${fmtMoney(config.capital)} initial investment`} · {allocation}</p>
    <dl className="my-5 flex flex-wrap gap-2">
      {metrics.map(([name, value]) => <div key={name} className="grow rounded-xl border border-slate-700/70 bg-slate-950/40 px-3 py-2">
        <dt className="text-xs text-slate-300">{name}</dt><dd className="mt-1 font-semibold tabular-nums">{value ?? "—"}</dd>
      </div>)}
    </dl>
    {data ? <SimulatorChart labels={data.dates} primary={data.portfolio} secondary={data.benchmark} mode="value"
      legendPrimary={staged ? "SPY DCA + cash" : allocation}
      legendSecondary={dca && !staged ? "SPY DCA" : "SPY lump sum"}
      monthly={dca} relativeLabel="Relative value" accountLabel={staged ? "Cash included" : dca ? "Monthly deposits" : "Buy & hold"}
      ariaLabel={config.title + " in US dollars"} />
    : <div className="grid min-h-64 place-content-center gap-2 text-center text-sm text-slate-300">
      <p role="status">{failed ? "Historical prices are temporarily unavailable." : "Loading historical prices…"}</p>
      {failed && <button type="button" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}
        className="min-h-11 cursor-pointer text-violet-300 underline">Retry chart</button>}
      <noscript>Enable JavaScript to explore the chart.</noscript>
    </div>}
    <p className="mt-4 text-xs leading-relaxed text-slate-300">
      {data && <><time>{data.dates[0]}</time> → <time>{data.dates.at(-1)}</time> · </>}
      SPY tracks the S&amp;P 500. Price changes only, excluding cash distributions. {staged && "Uninvested cash earns 0%. "}
      Educational &amp; illustrative — not investment advice.
    </p>
    <Link href="/dashboard?view=simulator" prefetch={false} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-violet-200 px-5 text-sm font-semibold text-slate-950 hover:bg-violet-100">Open in Simulator ↗</Link>
  </figure>;
}
