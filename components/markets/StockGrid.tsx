"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import type { UsQuote } from "@/lib/us-stocks";
import type { ViewerPlan } from "@/lib/access";
import { dict, type Lang } from "@/lib/i18n";
import StockCard from "./StockCard";
import StockDrawer from "./StockDrawer";

import { queueBacktestSymbol } from "@/lib/watchlist";
import { useSession } from "@/lib/use-session";
import { useWatchlist } from "../watchlist/WatchlistProvider";

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
  const close = useCallback(() => setSymbol(null), []);
  const open = Boolean(selected);

  function select(button: HTMLButtonElement) {
    opener.current = button;
    setSymbol(button.dataset.stock ?? null);
  }

  function selectAdjacent(next: number) {
    const button = grid.current?.querySelectorAll<HTMLButtonElement>("button[data-stock]")[next];
    if (button) select(button);
  }

  return <>
    <div ref={grid} className={`mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 ${open ? "xl:mr-[min(35vw,460px)] xl:grid-cols-2" : "xl:grid-cols-4"}`}>
      {stocks.map(quote => (
        <div key={quote.symbol} className="group relative min-w-0">
        <StockCard quote={quote} lang={lang} expanded={symbol === quote.symbol}
          onOpen={event => select(event.currentTarget)} />
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
    <StockDrawer selected={selected ?? null} lang={lang} plan={plan} preview={preview}
      opener={opener} onClose={close}
      onBackdropClick={event => {
        // Keep the visible cards selectable through the scrim.
        const card = document.elementsFromPoint(event.clientX, event.clientY)
          .find((el): el is HTMLButtonElement => el instanceof HTMLButtonElement && Boolean(grid.current?.contains(el)) && el.hasAttribute("data-stock"));
        if (card) select(card);
        else close();
      }}
      navigation={
        <div className="mb-3 flex items-center justify-between gap-2 text-xs text-[#8B9BB4]">
          <button type="button" disabled={index === 0} className="rounded-md px-2 py-1.5 hover:text-white disabled:opacity-30" onClick={() => selectAdjacent(index - 1)}>← {lang === "zh" ? "上一个" : "Previous"}</button>
          <span>{index + 1} / {stocks.length}</span>
          <button type="button" disabled={index === stocks.length - 1} className="rounded-md px-2 py-1.5 hover:text-white disabled:opacity-30" onClick={() => selectAdjacent(index + 1)}>{lang === "zh" ? "下一个" : "Next"} →</button>
        </div>
      }
    />
  </>;
}
