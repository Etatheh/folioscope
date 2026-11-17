"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/client-api";
import { dict, type Lang } from "@/lib/i18n";
import { useProfile } from "@/lib/use-profile";
import type { UsQuote } from "@/lib/us-stocks";
import {
  FEATURED_SYMBOLS,
  SYMBOL_NAMES,
  WATCHLIST_FOCUS_EVENT,
} from "@/lib/watchlist";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import ProBadge from "@/components/ui/ProBadge";
import MarketSearch from "./MarketSearch";
import QuoteCard from "./QuoteCard";
import { useWatchlist } from "./WatchlistProvider";

type Tab = "featured" | "mine";

function EmptyCard({
  title,
  body,
  cta,
  onCta,
  loading = false,
}: {
  title: string;
  body: string;
  cta?: string;
  onCta?: () => void;
  loading?: boolean;
}) {
  return (
    <div className="col-span-full flex min-h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-purple-400/25 bg-purple-500/[0.04] p-6 text-center">
      <span className="text-2xl" aria-hidden>
        {loading ? "◌" : "♡"}
      </span>
      <p className="text-sm font-medium text-slate-200">{title}</p>
      <p className="max-w-sm text-[11px] leading-relaxed text-slate-500">{body}</p>
      {cta && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="btn-primary mt-1 rounded-full px-4 py-1.5 text-[11px] font-semibold text-white"
        >
          {cta}
        </button>
      )}
    </div>
  );
}

function PendingCard({ symbol, lang }: { symbol: string; lang: Lang }) {
  return (
    <div className="data-card flex h-full min-h-40 flex-col justify-between rounded-xl p-4">
      <div>
        <p className="text-sm font-medium text-slate-200">
          {symbol}
          <span className="ml-2 text-[11px] text-slate-600">
            {SYMBOL_NAMES[symbol]?.[lang] ?? ""}
          </span>
        </p>
        <div className="mt-3 h-6 w-24 animate-pulse rounded bg-white/10" />
        <div className="mt-3 h-1.5 w-full animate-pulse rounded-full bg-white/5" />
      </div>
      <div className="mt-4 h-3 w-2/3 animate-pulse rounded bg-white/5" />
    </div>
  );
}

export default function WatchlistHub({
  lang,
  quotes,
  initialTab = "featured",
}: {
  lang: Lang;
  quotes: UsQuote[];
  initialTab?: Tab;
}) {
  const t = dict[lang].watchlist;
  const { user, ready, isPro } = useProfile();
  const { openAuthModal } = useAuthModal();
  const { symbols, count, loading, source } = useWatchlist();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [extraQuotes, setExtraQuotes] = useState<Record<string, UsQuote>>({});

  const featuredMap = useMemo(
    () => new Map(quotes.map((quote) => [quote.symbol, quote])),
    [quotes]
  );

  const missing = useMemo(
    () =>
      symbols.filter(
        (symbol) => !featuredMap.has(symbol) && !extraQuotes[symbol]
      ),
    [extraQuotes, featuredMap, symbols]
  );

  useEffect(() => {
    if (missing.length === 0) return;
    let cancelled = false;

    void Promise.all(
      missing.slice(0, 12).map(async (symbol) => {
        try {
          const response = await apiFetch(
            `/api/markets/quote?symbol=${encodeURIComponent(symbol)}`
          );
          if (!response.ok) return;
          const data = (await response.json()) as { quote?: UsQuote };
          if (!cancelled && data.quote) {
            setExtraQuotes((current) => ({ ...current, [symbol]: data.quote! }));
          }
        } catch {
          // keep the placeholder card
        }
      })
    );

    return () => {
      cancelled = true;
    };
  }, [missing]);

  useEffect(() => {
    const onFocus = () => setTab("mine");
    window.addEventListener(WATCHLIST_FOCUS_EVENT, onFocus);
    return () => window.removeEventListener(WATCHLIST_FOCUS_EVENT, onFocus);
  }, []);

  const mineQuotes = useMemo(
    () =>
      symbols
        .map((symbol) => featuredMap.get(symbol) ?? extraQuotes[symbol])
        .filter((quote): quote is UsQuote => Boolean(quote)),
    [extraQuotes, featuredMap, symbols]
  );

  const pendingSymbols = symbols.filter(
    (symbol) => !featuredMap.has(symbol) && !extraQuotes[symbol]
  );

  return (
    <article id="watchlist-panel" className="glass rounded-2xl p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex flex-wrap items-center gap-2 font-semibold text-white">
            {t.title}
            {isPro && (
              <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                PRO
              </span>
            )}
          </h2>
          <p className="mt-1 text-xs text-slate-500">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-amber-200/80">
            {t.featuredNote}
          </span>
          <ProBadge label={t.proSearchBadge} title={t.proLockedBody} />
        </div>
      </header>

      <MarketSearch lang={lang} featuredQuotes={quotes} />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label={t.title}
          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "featured"}
            onClick={() => setTab("featured")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              tab === "featured"
                ? "bg-gradient-to-r from-blue-500/30 to-purple-500/35 text-white ring-1 ring-purple-400/30"
                : "text-slate-500 hover:text-slate-200"
            }`}
          >
            {t.tabFeatured}
            <span className="ml-1.5 text-[10px] text-slate-500">14</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "mine"}
            onClick={() => setTab("mine")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              tab === "mine"
                ? "bg-gradient-to-r from-blue-500/30 to-purple-500/35 text-white ring-1 ring-purple-400/30"
                : "text-slate-500 hover:text-slate-200"
            }`}
          >
            {t.tabMine}
            <span
              className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] tabular-nums ${
                count > 0
                  ? "bg-purple-500/30 text-purple-100"
                  : "bg-white/10 text-slate-500"
              }`}
            >
              {count}
            </span>
          </button>
        </div>

        <p className="text-[11px] text-slate-600">
          {tab === "mine"
            ? !user
              ? t.guests
              : source === "local"
                ? t.localOnly
                : t.mineNote
            : t.featuredNote}
        </p>
      </div>

      {tab === "featured" ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {quotes.map((quote) => (
            <QuoteCard
              key={quote.symbol}
              quote={quote}
              lang={lang}
              featured
            />
          ))}
        </div>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {!ready || loading ? (
            <EmptyCard
              loading
              title={t.tabMine}
              body={t.subtitle}
            />
          ) : !user ? (
            <EmptyCard
              title={t.loginTitle}
              body={t.loginBody}
              cta={t.loginCta}
              onCta={() => openAuthModal({ mode: "login", lang })}
            />
          ) : symbols.length === 0 ? (
            <EmptyCard title={t.emptyTitle} body={t.emptyBody} />
          ) : (
            <>
              {mineQuotes.map((quote) => (
                <QuoteCard key={quote.symbol} quote={quote} lang={lang} />
              ))}
              {pendingSymbols.slice(0, 3).map((symbol) => (
                <PendingCard key={symbol} symbol={symbol} lang={lang} />
              ))}
            </>
          )}
        </div>
      )}

      {tab === "featured" && (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1">
            <span className="text-purple-300">♥</span>
            {t.add}
          </span>
          <span>{t.guests}</span>
          <span className="text-slate-700">·</span>
          <span>
            {FEATURED_SYMBOLS.length} {lang === "zh" ? "只标的" : "names"}
          </span>
        </p>
      )}
    </article>
  );
}