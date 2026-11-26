"use client";

import Link from "next/link";
import { usInstrumentHref } from "@/lib/dashboard-views";
import { useEffect, useRef, useState, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { UsQuote } from "@/lib/us-stocks";
import type { ViewerPlan } from "@/lib/access";
import { localizedName } from "@/lib/localized-text";
import { dict, type Lang } from "@/lib/i18n";
import { Sparkline, fmtCap, fmtPrice, fmtSigned, fmtVolume, MaValue, RsiValue, MacdValue } from "../market-ui";
import StockReportButton from "../stock/StockReportButton";

import { queueBacktestSymbol } from "@/lib/watchlist";
import { useSession } from "@/lib/use-session";
import { useWatchlist } from "../watchlist/WatchlistProvider";

function QuotePrice({ quote }: { quote: UsQuote }) {
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

function Trend({quote, height, lang}: {quote: UsQuote; height: number; lang: Lang}) {
  return quote.tech && quote.tech.sparkline.length > 1 ? (
    <Sparkline points={quote.tech.sparkline} change={quote.change} height={height} />
  ) : (
    <span className="my-2 grid place-items-center text-xs text-[#8B9BB4]" style={{height}}>
      {lang === "zh" ? "暂无走势数据" : "Trend unavailable"}
    </span>
  );
}

function Details({ quote, lang }: { quote: UsQuote; lang: Lang }) {
  const t = dict[lang].markets;
  const tech = quote.tech;
  const low = quote.week52Low;
  const high = quote.week52High;
  const position = low !== null && high !== null && high > low && quote.price > 0
    ? Math.max(0, Math.min(100, 100 * (quote.price - low) / (high - low))) : null;
  const metrics = [
    [t.open, fmtPrice(quote.open)], [t.highLabel, fmtPrice(quote.high)], [t.lowLabel, fmtPrice(quote.low)],
    [t.marketCap, quote.marketCapUsd === null ? "—" : fmtCap(quote.marketCapUsd)],
    [t.pe, quote.pe?.toFixed(2) ?? "—"], [dict[lang].detail.volume, fmtVolume(quote.volume)],
  ];
  return (
    <div className="space-y-7">
      <div>
        <QuotePrice quote={quote} />
        <Trend quote={quote} height={144} lang={lang} />
        <div className="flex items-center justify-between text-xs text-[#8B9BB4]">
          <span>{t.week52}</span><span>{low !== null && high !== null ? `$${fmtPrice(low)} – $${fmtPrice(high)}` : "—"}</span>
        </div>
        <div className="relative mt-2 h-[3px] rounded-full bg-[#94beff20]">
          {position !== null && <span className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300 shadow-[0_0_6px_#38bdf866]" style={{left: `${position}%`}} />}
        </div>
      </div>
      <section>
        <h3 className="mb-3 text-sm font-semibold">{lang === "zh" ? "基本面" : "Fundamentals"}</h3>
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-[#94beff14] bg-[#94beff14]">
          {metrics.map(([label, value]) => (
            <div key={label} className="bg-[#0B1120] px-3 py-3"><dt className="text-xs text-[#8B9BB4]">{label}</dt><dd className="mt-1 text-sm">{value}</dd></div>
          ))}
        </dl>
      </section>
      <section>
        <h3 className="mb-3 text-sm font-semibold">{lang === "zh" ? "技术指标" : "Technicals"}</h3>
        <div className="grid grid-cols-3 gap-3 border-t border-[#94beff14] pt-4 text-xs [&_.text-slate-600]:text-[#64748B] [&_.text-slate-600_span]:text-[#E2E8F0]">
          <MaValue label="MA5" value={tech?.ma5 ?? null} price={quote.price} lang={lang} />
          <MaValue label="MA10" value={tech?.ma10 ?? null} price={quote.price} lang={lang} />
          <MaValue label="MA20" value={tech?.ma20 ?? null} price={quote.price} lang={lang} />
          <RsiValue value={tech?.rsi14 ?? null} lang={lang} />
          <div className="col-span-2">{tech ? <MacdValue tech={tech} lang={lang} /> : <span className="text-[#64748B]">MACD —</span>}</div>
        </div>
      </section>
    </div>
  );
}

export default function StockGrid({stocks, lang, plan, children, preview}: {
  stocks: UsQuote[]; lang: Lang; plan: ViewerPlan; children: ReactNode; preview: boolean;
}) {
  const { has, toggle, loading, isPending } = useWatchlist();
  const { ready } = useSession();
  const actionStyle = "grid size-6 place-items-center rounded-md bg-[#0B1120] text-[#8B9BB4] hover:bg-[#0E1629] hover:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-sky-300";
  const [symbol, setSymbol] = useState<string | null>(null);
  const index = stocks.findIndex(stock => stock.symbol === symbol);
  const selected = stocks[index];
  const grid = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const dismiss = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  const open = Boolean(selected);
  useEffect(() => {
    if (!open) return;
    dismiss.current?.focus({preventScroll: true});
    // A nested portal can return focus to the body when it closes.
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] === dismiss.current?.closest('[role="dialog"]')) {
        setSymbol(null);
      }
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("keydown", onEscape);
      opener.current?.focus({preventScroll: true});
    };
  }, [open]);

  function handleKeys(event: ReactKeyboardEvent<HTMLElement>) {
    // The earnings report and upgrade dialogs render in their own portals.
    if (!event.currentTarget.contains(event.target as Node)) return;
    if (event.key === "Tab") {
      const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]');
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && event.target === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && event.target === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }

  function select(button: HTMLButtonElement) {
    opener.current = button;
    setSymbol(button.dataset.stock ?? null);
    if (open) dismiss.current?.focus({preventScroll: true});
  }

  function selectAdjacent(next: number) {
    const button = grid.current?.querySelectorAll<HTMLButtonElement>("button[data-stock]")[next];
    if (button) select(button);
  }

  return <>
    <div ref={grid} className={`mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 ${open ? "xl:mr-[min(35vw,460px)] xl:grid-cols-2" : "xl:grid-cols-4"}`}>
      {stocks.map(quote => (
        <div key={quote.symbol} className="group relative min-w-0">
        <button type="button" data-stock={quote.symbol} aria-haspopup="dialog"
          aria-expanded={symbol === quote.symbol} onClick={event => select(event.currentTarget)}
          className="block w-full min-w-0 [&_svg]:my-0 rounded-xl border border-[#94beff14] bg-[#0B1120] px-3 pb-1 pt-2 text-left shadow-[inset_0_1px_0_#a5cdff1f] transition-colors hover:border-[#94beff30] hover:bg-[#0E1629] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300 aria-expanded:border-[#38bdf880] aria-expanded:bg-[#0F1A30]">
          <span className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <span className="min-w-0"><strong className="block truncate text-[#F1F5F9]">{quote.symbol}</strong>
              <span className="block truncate text-xs text-[#8B9BB4]" title={localizedName(quote, lang)}>{localizedName(quote, lang)}</span>
            </span>
            <span className="text-right"><QuotePrice quote={quote} /></span>
          </span>
          {quote.tech && quote.tech.sparkline.length > 1 && (
            <span className="block text-[10px] leading-3 text-[#8B9BB4]">
              {quote.tech.sparkline.length}{lang === "zh" ? " 个交易日" : " sessions"}
            </span>
          )}
          <Trend quote={quote} lang={lang} height={44} />
        </button>
        <div className="absolute bottom-1 right-2 flex gap-1 opacity-0 pointer-events-none transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto">
          <button type="button" className={actionStyle} aria-pressed={has(quote.symbol)}
            aria-label={has(quote.symbol) ? dict[lang].watchlist.remove : dict[lang].watchlist.add}
            title={has(quote.symbol) ? dict[lang].watchlist.remove : dict[lang].watchlist.add}
            disabled={!ready || loading || isPending(quote.symbol)}
            onClick={event => { event.stopPropagation(); void toggle(quote.symbol, lang); }}>
            <span aria-hidden="true">{has(quote.symbol) ? "★" : "☆"}</span>
          </button>
          <button type="button" className={actionStyle} aria-label={lang === "zh" ? "在回测中打开" : "Open in Simulator"}
            title={lang === "zh" ? "在回测中打开" : "Open in Simulator"}
            onClick={event => {
              event.stopPropagation();
              queueBacktestSymbol(quote.symbol);
              window.location.assign(`/dashboard?lang=${lang}&view=simulator`);
            }}><span aria-hidden="true">↗</span></button>
        </div>
        </div>
      ))}
      {children}
    </div>
    {typeof document !== "undefined" && createPortal(<AnimatePresence>
      {selected && (
        <motion.div key="stock-layer" className="fixed inset-0 z-[75]" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: reduced ? 0 : 0.15}}>
          <div aria-hidden="true" className="absolute inset-0 bg-black/30" onClick={event => {
            // Keep the visible cards selectable through the scrim; consume other background clicks.
            const card = document.elementsFromPoint(event.clientX, event.clientY)
              .find((el): el is HTMLButtonElement => el instanceof HTMLButtonElement && Boolean(grid.current?.contains(el)) && el.hasAttribute("data-stock"));
            if (card) select(card);
            else setSymbol(null);
          }} />
          <motion.aside role="dialog" aria-modal="true" aria-labelledby="stock-drawer-title" onKeyDown={handleKeys}
            initial={{x: reduced ? 0 : "100%"}} animate={{x: 0}} exit={{x: reduced ? 0 : "100%"}} transition={{duration: reduced ? 0 : 0.23, ease: "easeOut"}}
            className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-[#94beff24] bg-[rgba(8,13,26,.88)] text-[#E2E8F0] tabular-nums shadow-[-24px_0_48px_rgba(0,0,0,.5)] backdrop-blur-[20px] sm:w-[min(460px,100vw)]">
            <header className="flex items-start justify-between gap-2 border-b border-[#94beff14] p-5">
              <div className="min-w-0"><h2 id="stock-drawer-title" className="text-2xl font-bold">{selected.symbol}</h2>
                <p className="text-sm text-[#8B9BB4]">{localizedName(selected, lang)}</p></div>
              <Link href={usInstrumentHref(selected.symbol, lang, preview)} className="shrink-0 rounded-lg border border-sky-300/20 px-2.5 py-2 text-xs text-sky-200">{lang === "zh" ? "完整图表" : "Full chart"} ↗</Link>
              <button ref={dismiss} type="button" aria-label={lang === "zh" ? "关闭" : "Close"} className="size-9 shrink-0 rounded-lg text-xl hover:bg-sky-100/5" onClick={() => setSymbol(null)}>×</button>
            </header>
            <div key={selected.symbol} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5"><Details quote={selected} lang={lang} /></div>
            <footer className="border-t border-[#94beff14] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="mb-3 flex items-center justify-between gap-2 text-xs text-[#8B9BB4]">
                <button type="button" disabled={index === 0} className="rounded-md px-2 py-1.5 hover:text-white disabled:opacity-30" onClick={() => selectAdjacent(index - 1)}>← {lang === "zh" ? "上一个" : "Previous"}</button>
                <span>{index + 1} / {stocks.length}</span>
                <button type="button" disabled={index === stocks.length - 1} className="rounded-md px-2 py-1.5 hover:text-white disabled:opacity-30" onClick={() => selectAdjacent(index + 1)}>{lang === "zh" ? "下一个" : "Next"} →</button>
              </div>
              <StockReportButton key={selected.symbol} symbol={selected.symbol} lang={lang} plan={plan} className="min-h-11 w-full justify-center text-sm" />
            </footer>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>, document.body)}
  </>;
}
