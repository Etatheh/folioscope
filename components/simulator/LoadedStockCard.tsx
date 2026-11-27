import { useCallback, useEffect, useRef, useState } from "react";
import StockCard from "@/components/markets/StockCard";
import StockDrawer from "@/components/markets/StockDrawer";
import type { ViewerPlan } from "@/lib/access";
import { apiFetch } from "@/lib/client-api";
import { dict, type Lang } from "@/lib/i18n";
import type { MarketSearchHit } from "@/lib/market-search";

export default function LoadedStockCard({
  hit, lang, plan, added, syncing, onAdd, onRemove,
}: {
  hit: MarketSearchHit;
  lang: Lang;
  plan: ViewerPlan;
  added: boolean;
  syncing: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<number[]>([]);
  const opener = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const { symbol, fullName } = hit;
  const quote = {
    ...hit.quote,
    name: fullName && hit.quote.name === hit.quote.nameEn ? fullName : hit.quote.name,
    nameEn: fullName || (hit.quote.nameEn === symbol ? hit.quote.name : hit.quote.nameEn),
  };
  const existingTrend = quote.tech?.sparkline;
  const hasTrend = (existingTrend?.length ?? 0) > 1;
  const sparkline = hasTrend ? existingTrend?.slice(-30) : history;
  const t = dict[lang].watchlist;

  useEffect(() => {
    if (hasTrend) return;
    const controller = new AbortController();

    async function loadTrend() {
      try {
        const response = await apiFetch(`/api/markets/series?symbol=${encodeURIComponent(symbol)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const { bars } = await response.json() as { bars?: { close: number }[] };
        if (!controller.signal.aborted && Array.isArray(bars)) {
          setHistory(bars.map(({ close }) => close).filter(Number.isFinite).slice(-30));
        }
      } catch {
        // The quote is still usable when history is unavailable.
      }
    }

    void loadTrend();
    return () => controller.abort();
  }, [hasTrend, symbol]);

  return (
    <section id="market-search-loaded" className="mt-4 w-full min-w-0 max-w-full">
      <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
        <h3 className="text-[10px] uppercase tracking-[0.18em] text-purple-300/80">{t.loadedToBoard}</h3>
        <button type="button" aria-label={t.close} onClick={onRemove}
          className="grid size-8 shrink-0 place-items-center text-slate-400 hover:bg-white/5 hover:text-white">
          ×
        </button>
      </div>
      <StockCard quote={quote} lang={lang} expanded={open} sparkline={sparkline} hideEmptyTrend
        onOpen={event => {
          opener.current = event.currentTarget;
          setOpen(true);
        }}
        footer={
          <button type="button" disabled={added || syncing}
            className="min-h-[44px] w-full max-w-full rounded-full bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white enabled:hover:bg-[#1D4ED8] disabled:cursor-default disabled:bg-[#172B49] disabled:text-sky-200"
            onClick={event => {
              event.stopPropagation();
              onAdd();
            }}>
            {added ? (lang === "zh" ? "✓ 已加入" : "✓ Added")
              : syncing ? t.syncing : (lang === "zh" ? "+ 加入回测" : "+ Add to Backtest")}
          </button>
        }
      />
      <StockDrawer selected={open ? quote : null} lang={lang} plan={plan}
        opener={opener} onClose={close} sparkline={sparkline} />
    </section>
  );
}
