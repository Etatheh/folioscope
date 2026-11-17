import { getUsMarketSnapshot, type UsMarketSnapshot } from "@/lib/us-stocks";
import { dict, type Lang } from "@/lib/i18n";
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

export default async function UsStockPanel({
  lang,
  plan,
  snapshot: providedSnapshot,
}: {
  lang: Lang;
  plan: ViewerPlan;
  /** Reuse the dashboard-level snapshot instead of fetching quotes twice. */
  snapshot?: UsMarketSnapshot;
}) {
  const t = dict[lang].markets;
  const snapshot = providedSnapshot ?? (await getUsMarketSnapshot());
  const { indices, stocks, demo, fetchedAt } = snapshot;
  const hrefFor = (symbol: string) =>
    `/dashboard/markets/${encodeURIComponent(symbol)}?lang=${lang}`;
  const visibleStocks = hasFullDashboardAccess(plan)
    ? stocks
    : stocks.filter((stock) => isSymbolUnlocked("us", stock.symbol, plan));
  const lockedCount = stocks.length - visibleStocks.length;

  return (
    <article className="glass min-w-0 overflow-x-clip rounded-2xl p-5 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-white">
            {t.title}
            {lang === "zh" && (
              <span className="ml-2 align-middle text-xs font-normal text-slate-500">
                U.S. Markets
              </span>
            )}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {demo
              ? t.demoNote
              : `${t.updated} ${fmtTime(fetchedAt)} · ${t.source}`}{" "}
            · {t.indicatorsHint} · {t.disclaimer}
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
        <StaggerGrid className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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

      {visibleStocks.length > 0 ? (
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
              currency="$"
              href={hrefFor(quote.symbol)}
            />
          ))}
          {lockedCount > 0 && (
            <UnlockCta lang={lang} plan={plan} count={lockedCount} />
          )}
        </StaggerGrid>
      ) : (
        <p className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm text-slate-500">
          {t.noData}
        </p>
      )}
    </article>
  );
}
