"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { dict, type Lang } from "@/lib/i18n";
import { useSession } from "@/lib/use-session";
import { symbolLabel, WATCHLIST_FOCUS_EVENT } from "@/lib/watchlist";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { useWatchlist } from "./WatchlistProvider";

/**
 * Navbar heart: opens a quick watchlist popover, shows the saved count and
 * sends anonymous visitors to the login dialog.
 */
export default function WatchlistNavButton({
  lang,
  className = "",
}: {
  lang: Lang;
  className?: string;
}) {
  const t = dict[lang].watchlist;
  const pathname = usePathname();
  const { user, ready } = useSession();
  const { openAuthModal } = useAuthModal();
  const { entries, count, loading, source, toggle, isPending } = useWatchlist();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleClick = () => {
    if (!ready) return;
    if (!user) {
      openAuthModal({ mode: "login", lang });
      return;
    }
    setOpen((value) => !value);
  };

  const viewAllHref = `/dashboard?lang=${lang}&tab=mine#watchlist`;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        aria-label={t.navTitle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`glass relative flex h-9 items-center gap-1.5 rounded-full px-3 text-slate-300 transition hover:border-purple-400/40 hover:text-white ${
          open ? "border-purple-400/45 text-white" : ""
        }`}
      >
        <span aria-hidden className="text-[15px] leading-none text-purple-300">
          {count > 0 ? "♥" : "♡"}
        </span>
        <span className="hidden text-[11px] font-medium sm:inline">
          {t.tabMine}
        </span>
        <span
          className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-semibold tabular-nums ${
            count > 0
              ? "bg-gradient-to-r from-purple-500/60 to-fuchsia-500/50 text-white shadow-[0_0_10px_-2px_rgba(168,85,247,0.9)]"
              : "bg-white/10 text-slate-500"
          }`}
        >
          {loading ? "·" : count}
        </span>
      </button>

      {open && (
        <div className="glass-panel absolute right-0 top-[calc(100%+0.6rem)] z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl p-3">
          <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
            <div>
              <p className="text-sm font-semibold text-white">{t.navTitle}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {count > 0 ? t.navCount(count) : t.navEmpty}
                {source === "local" && count > 0 ? ` · ${t.localOnly}` : ""}
              </p>
            </div>
            <span aria-hidden className="text-base text-purple-300">
              ♥
            </span>
          </div>

          {count === 0 ? (
            <div className="px-1 py-5 text-center">
              <p className="text-xs text-slate-400">{t.navEmpty}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
                {t.loginBody}
              </p>
            </div>
          ) : (
            <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-0.5">
              {entries.map((entry) => (
                <li
                  key={entry.symbol}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-white/[0.04]"
                >
                  <Link
                    href={`/dashboard/markets/${encodeURIComponent(
                      entry.symbol
                    )}?lang=${lang}`}
                    onClick={() => setOpen(false)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2"
                  >
                    <span className="text-xs font-medium text-slate-200">
                      {entry.symbol}
                    </span>
                    <span className="truncate text-[10px] text-slate-500">
                      {symbolLabel(entry.symbol, lang)}
                    </span>
                  </Link>
                  <button
                    type="button"
                    aria-label={t.remove}
                    disabled={isPending(entry.symbol)}
                    onClick={() => void toggle(entry.symbol, lang)}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs text-purple-300 transition hover:bg-purple-500/15 disabled:opacity-40"
                  >
                    ♥
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link
            href={viewAllHref}
            onClick={(event) => {
              setOpen(false);
              window.dispatchEvent(new Event(WATCHLIST_FOCUS_EVENT));
              if (pathname.startsWith("/dashboard")) {
                event.preventDefault();
                window.history.replaceState(null, "", viewAllHref);
                document
                  .getElementById("watchlist")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            className="mt-2 block rounded-full border border-purple-400/25 bg-purple-500/10 py-2 text-center text-[11px] font-medium text-purple-200 transition hover:border-purple-400/45 hover:text-white"
          >
            {user ? t.navViewAll : t.navLogin}
          </Link>
        </div>
      )}
    </div>
  );
}