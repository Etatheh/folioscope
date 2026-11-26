import { dict, type Lang } from "@/lib/i18n";
import type { UsMarketSnapshot } from "@/lib/us-stocks";
import { IndexCard } from "@/components/market-cards";
import StaggerGrid from "@/components/ui/StaggerGrid";

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

function RegionCard({
  lang,
  title,
  titleEn,
  snapshot,
}: {
  lang: Lang;
  title: string;
  titleEn: string;
  snapshot: UsMarketSnapshot;
}) {
  const t = dict[lang].markets;
  return (
    <article className="min-w-0 rounded-2xl border border-[#94beff14] bg-[#0B1120] p-4 sm:p-5">
      <header className="flex items-start justify-between gap-3 border-b border-[#94beff12] pb-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-white sm:text-lg">
            {title}
            {lang === "zh" && titleEn && (
              <span className="ml-2 align-middle text-xs font-normal text-slate-500">
                {titleEn}
              </span>
            )}
          </h2>
          <p className="mt-1 text-xs text-[#8B9BB4]">
            {snapshot.demo
              ? t.demoNote
              : `${t.updated} ${fmtTime(snapshot.fetchedAt, lang)}`}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${
            snapshot.demo
              ? "bg-amber-400/10 text-amber-400"
              : "bg-emerald-400/10 text-emerald-400"
          }`}
        >
          {snapshot.demo ? t.demo : t.live}
        </span>
      </header>

      {snapshot.indices.length > 0 ? (
        <StaggerGrid className="mt-4 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-3">
          {snapshot.indices.map((quote) => (
            <IndexCard
              key={quote.symbol}
              quote={quote}
              lang={lang}
              href={`/dashboard/markets/${encodeURIComponent(quote.symbol)}?lang=${lang}`}
            />
          ))}
        </StaggerGrid>
      ) : (
        <p className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm text-slate-500">
          {t.noData}
        </p>
      )}
    </article>
  );
}

/**
 * Default dashboard landing view: one compact card per region, each showing
 * only the benchmark indices. Dedicated views hold the deeper stock boards.
 */
export default function GlobalMarketsOverview({
  lang,
  us,
  europe,
  asia,
  cn,
}: {
  lang: Lang;
  us: UsMarketSnapshot;
  europe: UsMarketSnapshot;
  asia: UsMarketSnapshot;
  cn?: UsMarketSnapshot | null;
}) {
  const boards = dict[lang].boards;
  const markets = dict[lang].markets;

  return (
    <section className="grid min-w-0 gap-4 sm:gap-5" aria-label={dict[lang].views.all.title}>
      <RegionCard
        lang={lang}
        title={markets.title}
        titleEn="U.S. Markets"
        snapshot={{ ...us, stocks: [] }}
      />
      <RegionCard
        lang={lang}
        title={boards.europe.title}
        titleEn={boards.europe.titleEn}
        snapshot={europe}
      />
      <RegionCard
        lang={lang}
        title={boards.asia.title}
        titleEn={boards.asia.titleEn}
        snapshot={{ ...asia, stocks: [] }}
      />
      {cn && (
        <RegionCard
          lang={lang}
          title={boards.cn.title}
          titleEn={boards.cn.titleEn}
          snapshot={{ ...cn, stocks: [] }}
        />
      )}
      <p className="px-1 text-xs text-[#8B9BB4]">{markets.disclaimer}</p>
    </section>
  );
}