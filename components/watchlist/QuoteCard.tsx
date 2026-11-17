import Link from "next/link";

import type { Lang } from "@/lib/i18n";
import { dict } from "@/lib/i18n";
import type { UsQuote } from "@/lib/us-stocks";
import type { ViewerPlan } from "@/lib/access";
import {
  MaValue,
  MacdValue,
  RsiValue,
  Sparkline,
  fmtPrice,
} from "@/components/market-ui";
import StockReportButton from "@/components/stock/StockReportButton";
import FavoriteButton from "./FavoriteButton";

function names(quote: UsQuote, lang: Lang) {
  if (lang === "zh") return { primary: quote.name, secondary: quote.nameEn };
  return { primary: quote.nameEn || quote.name, secondary: null as string | null };
}

function RangeBar({ quote }: { quote: UsQuote }) {
  const span = quote.high - quote.low;
  const pct =
    span > 0
      ? Math.min(100, Math.max(0, ((quote.price - quote.low) / span) * 100))
      : 50;
  const up = quote.change >= 0;
  return (
    <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${
          up
            ? "bg-gradient-to-r from-emerald-500/45 to-emerald-400"
            : "bg-gradient-to-r from-rose-500/45 to-rose-400"
        }`}
        style={{ width: `${pct}%` }}
      />
      <div
        className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

export default function QuoteCard({
  quote,
  lang,
  plan,
  featured = false,
}: {
  quote: UsQuote;
  lang: Lang;
  plan?: ViewerPlan;
  featured?: boolean;
}) {
  const t = dict[lang].markets;
  const tw = dict[lang].watchlist;
  const { primary, secondary } = names(quote, lang);
  const up = quote.change >= 0;
  const hasPrice = quote.price > 0;
  const href = `/dashboard/markets/${encodeURIComponent(quote.symbol)}?lang=${lang}`;

  return (
    <article className="data-card group relative h-full rounded-xl p-4">
      <div className="absolute right-3 top-3 z-10">
        <FavoriteButton symbol={quote.symbol} lang={lang} />
      </div>

      <Link
        href={href}
        className="block pr-9"
        aria-label={`${tw.viewDetail} · ${quote.symbol}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-200">
              {primary}
              <span className="ml-1 text-slate-600">· {quote.symbol}</span>
            </p>
            {secondary && (
              <p className="mt-0.5 truncate text-[11px] text-slate-600">{secondary}</p>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xl font-semibold tabular-nums text-white">
              {hasPrice ? `$${fmtPrice(quote.price)}` : "—"}
            </p>
            <p
              className={`mt-0.5 text-xs tabular-nums ${
                up ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {hasPrice
                ? `${up ? "+" : ""}${quote.change.toFixed(2)} (${
                    up ? "+" : ""
                  }${quote.changePct.toFixed(2)}%)`
                : "—"}
            </p>
          </div>
          {quote.tech?.sparkline ? (
            <Sparkline points={quote.tech.sparkline} />
          ) : (
            <span
              aria-hidden
              className="mb-1 h-8 w-16 rounded-md bg-gradient-to-r from-purple-500/10 to-blue-500/10 ring-1 ring-white/5"
            />
          )}
        </div>

        {hasPrice && <RangeBar quote={quote} />}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-white/5 pt-2 text-[11px] tabular-nums">
          <MaValue
            label="MA5"
            value={quote.tech?.ma5 ?? null}
            price={quote.price}
            lang={lang}
          />
          <MaValue
            label="MA20"
            value={quote.tech?.ma20 ?? null}
            price={quote.price}
            lang={lang}
          />
          <RsiValue value={quote.tech?.rsi14 ?? null} lang={lang} />
          {quote.tech && quote.tech.macd !== null && (
            <MacdValue tech={quote.tech} lang={lang} />
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-white/5 pt-2 text-[11px] tabular-nums text-slate-600">
          <span>
            {t.highLabel} {hasPrice ? `$${fmtPrice(quote.high)}` : "—"}
          </span>
          <span>
            {t.lowLabel} {hasPrice ? `$${fmtPrice(quote.low)}` : "—"}
          </span>
          {featured && (
            <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-200/80">
              Free
            </span>
          )}
        </div>
      </Link>

      <div className="mt-2.5 flex justify-end border-t border-white/5 pt-2">
        <StockReportButton symbol={quote.symbol} lang={lang} plan={plan} variant="chip" />
      </div>
    </article>
  );
}