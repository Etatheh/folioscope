"use client";

import type { Lang } from "@/lib/i18n";
import { dict } from "@/lib/i18n";
import { useSession } from "@/lib/use-session";
import { useWatchlist } from "./WatchlistProvider";

export default function FavoriteButton({
  symbol,
  lang,
  className = "",
  size = "md",
}: {
  symbol: string;
  lang: Lang;
  className?: string;
  size?: "sm" | "md";
}) {
  const t = dict[lang].watchlist;
  const { has, isPending, loading, toggle } = useWatchlist();
  const { ready } = useSession();
  const saved = has(symbol);
  const pending = isPending(symbol);
  const disabled = pending || loading || !ready;

  return (
    <button
      type="button"
      aria-label={saved ? t.remove : t.add}
      title={saved ? t.remove : t.add}
      aria-pressed={saved}
      disabled={disabled}
      aria-busy={disabled}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void toggle(symbol, lang);
      }}
      className={`group/heart grid shrink-0 place-items-center rounded-full border transition-all duration-200 ${
        size === "sm" ? "h-7 w-7 text-sm" : "h-8 w-8 text-base"
      } ${
        saved
          ? "border-sky-400/50 bg-sky-500/20 text-sky-300 shadow-[0_0_16px_-4px_rgba(56,189,248,0.85)]"
          : "border-white/10 bg-white/[0.03] text-slate-500 hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-sky-300"
      } ${pending ? "animate-pulse cursor-wait opacity-70" : ""} ${className}`}
    >
      <span aria-hidden className="leading-none transition-transform group-hover/heart:scale-110">
        {saved ? "♥" : "♡"}
      </span>
    </button>
  );
}