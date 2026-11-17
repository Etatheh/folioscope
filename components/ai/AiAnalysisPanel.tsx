import AiSummaryCard from "@/components/AiSummaryCard";
import StockReportButton from "@/components/stock/StockReportButton";
import type { ViewerPlan } from "@/lib/access";
import { dict, type Lang } from "@/lib/i18n";
import { FEATURED_SYMBOLS, SYMBOL_NAMES } from "@/lib/watchlist";

/**
 * Dedicated AI view: the daily market summary plus a one-click launcher for
 * every curated name's earnings / fundamentals report. The card chips use the
 * same StockReportButton as the market boards, so both entry points open the
 * same diagnostic dialog.
 */
export default function AiAnalysisPanel({
  lang,
  plan,
}: {
  lang: Lang;
  plan: ViewerPlan;
}) {
  const t = dict[lang].aiAnalysis;

  return (
    <section className="grid min-w-0 gap-5 xl:grid-cols-[1.25fr_1fr]">
      <AiSummaryCard lang={lang} plan={plan} />

      <article className="data-card min-w-0 overflow-x-clip rounded-2xl p-5 sm:p-6">
        <header>
          <h2 className="font-semibold text-white">{t.title}</h2>
          <p className="mt-1 text-xs text-slate-500">{t.subtitle}</p>
        </header>

        <p className="mt-3 text-[11px] uppercase tracking-wider text-slate-600">
          {t.pick}
        </p>

        <div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2">
          {FEATURED_SYMBOLS.map((symbol) => {
            const names = SYMBOL_NAMES[symbol];
            return (
              <div
                key={symbol}
                className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-200">
                    {symbol}
                  </p>
                  <p className="truncate text-[10px] text-slate-600">
                    {names?.[lang] ?? symbol}
                  </p>
                </div>
                <StockReportButton
                  symbol={symbol}
                  lang={lang}
                  plan={plan}
                  variant="chip"
                  className="shrink-0"
                />
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-[10px] leading-relaxed text-slate-600">
          {t.hint}
        </p>
      </article>
    </section>
  );
}