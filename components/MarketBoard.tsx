import { dict, type Lang } from "@/lib/i18n";
import type { UsMarketSnapshot } from "@/lib/us-stocks";
import {
  hasFullDashboardAccess,
  isSymbolUnlocked,
  type ViewerPlan,
} from "@/lib/access";
import { IndexCard, StockCard, UnlockCta } from "./market-cards";
import StaggerGrid from "./ui/StaggerGrid";

function fmtTime(ms: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

export default function MarketBoard({
  lang,
  plan,
  market,
  title,
  titleEn,
  snapshot,
  stockCurrency = "",
  stockCurrencies,
  stockDetail = true,
  detailBase = "/dashboard/markets",
  indexGridClass = "md:grid-cols-2 xl:grid-cols-4",
}: {
  lang: Lang;
  plan: ViewerPlan;
  market: "cn" | "asia" | "europe";
  title: string;
  titleEn: string;
  snapshot: UsMarketSnapshot;
  stockCurrency?: string;
  stockCurrencies?: Record<string, string>;
  stockDetail?: boolean;
  detailBase?: string;
  indexGridClass?: string;
}) {
  const t = dict[lang].markets;
  const { indices, stocks, demo, fetchedAt } = snapshot;
  const hrefFor = (symbol: string) =>
    `${detailBase}/${encodeURIComponent(symbol)}?lang=${lang}`;
  const empty = indices.length === 0 && stocks.length === 0;
  const visibleStocks = hasFullDashboardAccess(plan)
    ? stocks
    : stocks.filter((stock) => isSymbolUnlocked(market, stock.symbol, plan));
  const lockedCount = stocks.length - visibleStocks.length;

  return (
    <article className="glass min-w-0 overflow-x-clip rounded-2xl p-5 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-white">
            {title}
            {lang === "zh" && titleEn && (
              <span className="ml-2 align-middle text-xs font-normal text-slate-500">
                {titleEn}
              </span>
            )}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {demo
              ? t.demoNote
              : `${t.updated} ${fmtTime(fetchedAt)}`}{" "}
            · {t.disclaimer}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs ${
            demo
              ? "bg-amber-400/10 text-amber-400"
              : "bg-emerald-400/10 text-emerald-400"
          }`}
        >
          {demo ? t.demo : t.live}
        </span>
      </header>

      {indices.length > 0 && (
        <StaggerGrid className={`mt-5 grid gap-3 ${indexGridClass}`}>
          {indices.map((quote) => (
            <IndexCard
              key={quote.symbol}
              quote={quote}
              lang={lang}
              href={hrefFor(quote.symbol)}
            />
          ))}
        </StaggerGrid>
      )}

      {visibleStocks.length > 0 && (
        <StaggerGrid
          className="mt-3 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3"
          stagger={0.05}
          delay={0.12}
        >
          {visibleStocks.map((quote) => (
            <StockCard
              key={quote.symbol}
              quote={quote}
              lang={lang}
              plan={plan}
              currency={stockCurrencies?.[quote.symbol] ?? stockCurrency}
              href={stockDetail ? hrefFor(quote.symbol) : undefined}
            />
          ))}
          {lockedCount > 0 && (
            <UnlockCta lang={lang} plan={plan} count={lockedCount} />
          )}
        </StaggerGrid>
      )}

      {empty && (
        <p className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm text-slate-500">
          {t.noData}
        </p>
      )}
    </article>
  );
}
