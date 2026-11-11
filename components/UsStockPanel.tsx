import { getUsMarketSnapshot } from "@/lib/us-stocks";
import { dict, type Lang } from "@/lib/i18n";
import { IndexCard, StockCard } from "./market-cards";

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

export default async function UsStockPanel({ lang }: { lang: Lang }) {
  const t = dict[lang].markets;
  const snapshot = await getUsMarketSnapshot();
  const { indices, stocks, demo, fetchedAt } = snapshot;
  const hrefFor = (symbol: string) => `/dashboard/markets/${symbol}?lang=${lang}`;

  return (
    <article className="glass rounded-2xl p-5 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">
            {t.title}
            <span className="ml-2 align-middle text-xs font-normal text-slate-500">
              {lang === "zh" ? "U.S. Markets" : "美股行情"}
            </span>
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
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {indices.map((quote) => (
            <IndexCard
              key={quote.symbol}
              quote={quote}
              lang={lang}
              href={hrefFor(quote.symbol)}
            />
          ))}
        </div>
      )}

      {stocks.length > 0 ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {stocks.map((quote) => (
            <StockCard
              key={quote.symbol}
              quote={quote}
              lang={lang}
              currency="$"
              href={hrefFor(quote.symbol)}
            />
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm text-slate-500">
          {t.noData}
        </p>
      )}
    </article>
  );
}
