import { getUsMarketSnapshot, type UsMarketSnapshot } from "@/lib/us-stocks";
import { dict, type Lang } from "@/lib/i18n";
import {
  hasFullDashboardAccess,
  isSymbolUnlocked,
  type ViewerPlan,
} from "@/lib/access";
import Link from "next/link";
import { localizedName } from "@/lib/localized-text";
import { fmtPrice, fmtSigned } from "./market-ui";
import StockGrid from "./markets/StockGrid";
import { usInstrumentHref } from "@/lib/dashboard-views";
import { UnlockCta } from "./market-cards";

function fmtTime(ms: number, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
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
  preview = false,
}: {
  lang: Lang;
  plan: ViewerPlan;
  /** Reuse the dashboard-level snapshot instead of fetching quotes twice. */
  snapshot?: UsMarketSnapshot;
  preview?: boolean;
}) {
  const t = dict[lang].markets;
  const snapshot = providedSnapshot ?? (await getUsMarketSnapshot());
  const { indices, stocks, demo, fetchedAt } = snapshot;
  const visibleStocks = hasFullDashboardAccess(plan)
    ? stocks
    : stocks.filter((stock) => isSymbolUnlocked("us", stock.symbol, plan));
  const lockedCount = stocks.length - visibleStocks.length;

  const covered = visibleStocks.filter(stock => stock.price > 0 && Number.isFinite(stock.change));
  const pulse = [
    { label: lang === "zh" ? "上涨" : "Rising", count: covered.filter(stock => stock.change > 0).length, color: "#34D399" },
    { label: lang === "zh" ? "持平" : "Flat", count: covered.filter(stock => stock.change === 0).length, color: "#8B9BB4" },
    { label: lang === "zh" ? "下跌" : "Falling", count: covered.filter(stock => stock.change < 0).length, color: "#F87171" },
  ];

  return (
    <article className="min-w-0 rounded-2xl border border-[#94beff12] bg-[#060A14] p-3 sm:p-5">
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
              : `${t.updated} ${fmtTime(fetchedAt, lang)} · ${lang === "zh" ? "实时行情" : "Live market feed"}`}{" "}
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

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
        {indices.length > 0 && (
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#94beff12] bg-[#94beff12] sm:grid-cols-4">
            {indices.map(quote => (
              <Link key={quote.symbol} href={usInstrumentHref(quote.symbol, lang, preview)} className="flex min-w-0 flex-col justify-center gap-1 bg-[#0B1120] p-3 tabular-nums hover:bg-[#0E1629] focus-visible:outline-offset-[-2px]">
                <span className="text-xs text-[#8B9BB4]">{localizedName(quote, lang)}</span>
                <strong className="text-lg font-semibold tracking-tight text-[#F1F5F9]">{fmtPrice(quote.price)}</strong>
                <span className={`text-xs ${quote.change >= 0 ? "text-[#34D399]" : "text-[#F87171]"}`}>{fmtSigned(quote.changePct)}%</span>
              </Link>
            ))}
          </div>
        )}
        <section className="rounded-2xl border border-sky-200/10 bg-[#0e192b] px-4 py-3 shadow-[inset_0_1px_0_#7dd3fc40]">
          <h3 className="text-sm font-semibold text-sky-100">{lang === "zh" ? "市场脉搏" : "Market Pulse"}</h3>
          <p className="mt-0.5 text-[11px] text-[#8B9BB4]">{lang === "zh" ? "当前列表中的标的" : "In this stock & ETF list"}</p>
          <dl className="mt-2 grid grid-cols-3 gap-2">{pulse.map(({label,count,color}) => (
            <div key={label}><dt className="text-xs text-[#8B9BB4]">{label}</dt><dd className="text-xl font-semibold tabular-nums" style={{color}}>{count}</dd></div>
          ))}</dl>
          <div aria-hidden="true" className="mt-2 flex h-1 overflow-hidden rounded-full bg-[#94beff14]">
            {pulse.map(({label, count, color}) => count > 0 && (
              <span key={label} style={{flex: count, backgroundColor: color}} />
            ))}
          </div>
        </section>
      </div>

      {visibleStocks.length > 0 ? (
        <StockGrid stocks={visibleStocks} lang={lang} plan={plan} preview={preview}>
          {lockedCount > 0 && <UnlockCta lang={lang} plan={plan} count={lockedCount} />}
        </StockGrid>
      ) : (
        <p className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm text-slate-500">
          {t.noData}
        </p>
      )}
    </article>
  );
}
