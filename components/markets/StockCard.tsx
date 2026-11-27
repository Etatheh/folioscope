import type { MouseEventHandler, ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import { localizedName } from "@/lib/localized-text";
import type { UsQuote } from "@/lib/us-stocks";
import { Sparkline, fmtPrice, fmtSigned } from "../market-ui";

export function QuotePrice({ quote }: { quote: UsQuote }) {
  return (
    <span className="block whitespace-nowrap tabular-nums">
      <strong className="block text-[1.28em] font-semibold leading-tight tracking-tight text-[#F1F5F9]">
        {quote.price > 0 ? `$${fmtPrice(quote.price)}` : "—"}
      </strong>
      <span className={`text-xs ${quote.change >= 0 ? "text-[#34D399]" : "text-[#F87171]"}`}>
        {quote.price > 0 ? `${fmtSigned(quote.change)} (${fmtSigned(quote.changePct)}%)` : "—"}
      </span>
    </span>
  );
}

export function StockTrend({ points, change, height, lang }: { points: number[]; change: number; height: number; lang: Lang }) {
  return points.length > 1 ? (
    <Sparkline points={points} change={change} height={height} />
  ) : (
    <span className="my-2 grid place-items-center text-xs text-[#8B9BB4]" style={{height}}>
      {lang === "zh" ? "暂无走势数据" : "Trend unavailable"}
    </span>
  );
}

const stockCardSurface = "rounded-xl border border-[#94beff14] bg-[#0B1120] shadow-[inset_0_1px_0_#a5cdff1f]";

export default function StockCard({
  quote, lang, expanded, onOpen, sparkline, hideEmptyTrend = false, footer,
}: {
  quote: UsQuote;
  lang: Lang;
  expanded: boolean;
  onOpen: MouseEventHandler<HTMLButtonElement>;
  sparkline?: number[];
  hideEmptyTrend?: boolean;
  footer?: ReactNode;
}) {
  const points = sparkline ?? quote.tech?.sparkline ?? [];
  const name = localizedName(quote, lang);
  const trigger = (
    <button type="button" data-stock={quote.symbol} aria-haspopup="dialog"
      aria-expanded={expanded} onClick={onOpen}
      data-stock-card-trigger className={`block w-full max-w-full min-w-0 cursor-pointer [&_svg]:my-0 px-3 pb-1 pt-2 text-left transition-colors hover:border-[#94beff30] hover:bg-[#0E1629] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300 aria-expanded:border-[#38bdf880] aria-expanded:bg-[#0F1A30] ${footer ? "rounded-t-xl" : stockCardSurface}`}>
      <span className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <span className="min-w-0"><strong className="block truncate text-[#F1F5F9]">{quote.symbol}</strong>
          <span className={`block text-xs text-[#8B9BB4] ${footer ? "wrap-anywhere" : "truncate"}`} title={name}>{name}</span>
        </span>
        <span className="text-right"><QuotePrice quote={quote} /></span>
      </span>
      {points.length > 1 && (
        <span className="block text-[10px] leading-3 text-[#8B9BB4]">
          {points.length}{lang === "zh" ? " 个交易日" : " sessions"}
        </span>
      )}
      {(points.length > 1 || !hideEmptyTrend) && <StockTrend points={points} change={quote.change} lang={lang} height={44} />}
    </button>
  );

  return footer ? (
    <div className={`w-full min-w-0 max-w-full ${stockCardSurface}`}>
      {trigger}
      <div className="px-3 pb-3 pt-2">{footer}</div>
    </div>
  ) : trigger;
}
