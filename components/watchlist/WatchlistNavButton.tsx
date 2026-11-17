"use client";

import { usePathname, useRouter } from "next/navigation";

import { dict, type Lang } from "@/lib/i18n";
import { useSession } from "@/lib/use-session";
import { WATCHLIST_FOCUS_EVENT } from "@/lib/watchlist";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { useWatchlist } from "./WatchlistProvider";

/**
 * Navbar heart: jumps straight to the watchlist tab and carries the saved
 * count badge. Anonymous visitors are routed to the existing login dialog.
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
  const router = useRouter();
  const { user, ready } = useSession();
  const { openAuthModal } = useAuthModal();
  const { count, loading } = useWatchlist();

  const handleClick = () => {
    if (!ready) return;
    if (!user) {
      openAuthModal({ mode: "login", lang });
      return;
    }

    const href = `/dashboard?lang=${lang}&view=watchlist&tab=mine`;
    if (pathname.startsWith("/dashboard")) {
      window.dispatchEvent(new Event(WATCHLIST_FOCUS_EVENT));
      router.push(href);
      window.setTimeout(() => {
        document
          .getElementById("watchlist")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
      return;
    }

    window.location.href = href;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={t.navTitle}
      title={t.navTitle}
      className={`glass relative flex h-9 items-center gap-1.5 rounded-full px-3 text-slate-300 transition hover:border-purple-400/40 hover:text-white ${className}`}
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
  );
}