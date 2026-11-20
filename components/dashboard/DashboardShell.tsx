"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import AccountModal from "@/components/account/AccountModal";
import BackgroundEffects from "@/components/BackgroundEffects";
import LangToggle from "@/components/LangToggle";
import UserMenu from "@/components/UserMenu";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import ProUpgradeButton from "@/components/ui/ProUpgradeButton";
import { Icon } from "@/components/ui/Icon";
import { Reveal, StaggerGroup } from "@/components/ui/Reveal";
import WatchlistNavButton from "@/components/watchlist/WatchlistNavButton";
import { useWatchlist } from "@/components/watchlist/WatchlistProvider";
import { hasFullDashboardAccess, type ViewerPlan } from "@/lib/access";
import {
  dashboardViewHref,
  isMarketView,
  type DashboardView,
} from "@/lib/dashboard-views";
import { dict, type Lang } from "@/lib/i18n";
import { useSession } from "@/lib/use-session";
import { useViewerPlan } from "@/lib/use-profile";
import { FEATURED_SYMBOLS } from "@/lib/watchlist";

const MARKET_ITEMS: {
  key: DashboardView;
  icon: "grid" | "us" | "globe" | "markets";
  label: keyof ReturnType<typeof marketLabels>;
}[] = [
  { key: "all", icon: "grid", label: "allMarkets" },
  { key: "us", icon: "us", label: "usMarkets" },
  { key: "europe", icon: "globe", label: "europe" },
  { key: "asia", icon: "markets", label: "asiaPacific" },
];

function marketLabels(lang: Lang) {
  return dict[lang].sidebar;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DashboardShell({
  lang,
  plan,
  view,
  children,
}: {
  lang: Lang;
  plan: ViewerPlan;
  view: DashboardView;
  children: ReactNode;
}) {
  const t = dict[lang].sidebar;
  const viewCopy = dict[lang].views[view];
  const router = useRouter();
  const { user, ready } = useSession();
  const { openAuthModal } = useAuthModal();
  const effectivePlan = useViewerPlan(plan);
  const isPro = hasFullDashboardAccess(effectivePlan);
  const isAdmin = effectivePlan === "admin";
  const { count } = useWatchlist();

  const [collapsed, setCollapsed] = useState(false);
  const [marketsOpen, setMarketsOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const toggleCollapsed = () => setCollapsed((value) => !value);

  const openAccount = () => {
    if (!ready) return;
    setMobileOpen(false);
    if (!user) {
      openAuthModal({ mode: "login", lang });
      return;
    }
    setAccountOpen(true);
  };

  const marketsActive = isMarketView(view);
  const labels = marketLabels(lang);
  const badge = isAdmin ? t.admin : isPro ? t.pro : t.free;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <BackgroundEffects />

      {mobileOpen && (
        <button
          type="button"
          aria-label={t.closeMenu}
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        aria-label={t.menuLabel}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[86vw] flex-col border-r border-purple-500/10 bg-[#050917]/95 px-3 py-5 backdrop-blur-xl transition-[transform,width] duration-300 lg:translate-x-0 lg:bg-[#050917]/85 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-20 lg:px-2.5" : "lg:w-64 lg:px-4"}`}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? t.expand : t.collapse}
          title={collapsed ? t.expand : t.collapse}
          className="absolute -right-3 top-7 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-purple-400/25 bg-[#0a0f1d] text-slate-400 shadow-lg shadow-black/40 transition hover:border-purple-400/50 hover:text-white lg:flex"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
            className={`h-3.5 w-3.5 transition-transform ${collapsed ? "rotate-180" : ""}`}
          >
            <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="flex items-center gap-2 px-1.5 pb-5">
          <Link
            href={dashboardViewHref(lang, "all")}
            onClick={() => setMobileOpen(false)}
            className={`flex min-w-0 items-center gap-2.5 ${
              collapsed ? "lg:mx-auto lg:justify-center" : ""
            }`}
            aria-label="FolioScope dashboard"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-purple-500/25">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M3 17l5-5 4 4 8-8" />
                <path d="M14 8h6v6" />
              </svg>
            </span>
            <span
              className={`truncate text-sm font-semibold tracking-tight text-white ${
                collapsed ? "lg:hidden" : ""
              }`}
            >
              FolioScope
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label={t.closeMenu}
            className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-lg leading-none text-slate-400 transition hover:bg-white/5 hover:text-white lg:hidden"
          >
            ×
          </button>
        </div>

        <nav
          className={`flex-1 space-y-1.5 pb-4 ${
            collapsed ? "overflow-visible" : "overflow-y-auto"
          }`}
        >
          <div className="group/markets relative">
            <button
              type="button"
              onClick={() => {
                if (collapsed) {
                  router.push(dashboardViewHref(lang, "all"));
                  setMobileOpen(false);
                } else {
                  setMarketsOpen((value) => !value);
                }
              }}
              aria-expanded={marketsOpen}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                marketsActive
                  ? "bg-gradient-to-r from-blue-500/15 to-purple-500/15 text-white ring-1 ring-purple-400/20"
                  : "text-slate-500 hover:bg-white/5 hover:text-slate-200"
              } ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
            >
              <Icon name="markets" className="h-5 w-5 shrink-0" />
              <span className={`min-w-0 flex-1 truncate text-left ${collapsed ? "lg:hidden" : ""}`}>
                {t.markets}
              </span>
              <span className={collapsed ? "lg:hidden" : ""}>
                <Chevron open={marketsOpen} />
              </span>
            </button>

            <div
              className={`mt-1 space-y-1 ${marketsOpen ? "block" : "hidden"} ${
                collapsed ? "lg:hidden" : ""
              }`}
            >
              {MARKET_ITEMS.map((item) => {
                const active = view === item.key;
                return (
                  <Link
                    key={item.key}
                    href={dashboardViewHref(lang, item.key)}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 rounded-xl py-2 pl-9 pr-3 text-[13px] transition ${
                      active
                        ? "bg-purple-500/15 text-white ring-1 ring-purple-400/20"
                        : "text-slate-500 hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                    <span className="truncate">{labels[item.label]}</span>
                  </Link>
                );
              })}
            </div>

            {/* Icon-mode fly-out: hovering Markets reveals its four views. */}
            {collapsed && (
              <div className="pointer-events-none absolute left-full top-0 z-50 hidden w-56 lg:group-hover/markets:pointer-events-auto lg:group-hover/markets:block">
                <div className="glass-panel rounded-2xl p-1.5 shadow-2xl shadow-black/60">
                  <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300/80">
                    {t.markets}
                  </p>
                  {MARKET_ITEMS.map((item) => {
                    const active = view === item.key;
                    return (
                      <Link
                        key={item.key}
                        href={dashboardViewHref(lang, item.key)}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition ${
                          active
                            ? "bg-purple-500/15 text-white"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                        {labels[item.label]}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <Link
            href={dashboardViewHref(lang, "watchlist")}
            onClick={() => setMobileOpen(false)}
            title={t.watchlist}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              view === "watchlist"
                ? "bg-gradient-to-r from-blue-500/15 to-purple-500/15 text-white ring-1 ring-purple-400/20"
                : "text-slate-500 hover:bg-white/5 hover:text-slate-200"
            } ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
          >
            <Icon name="watchlist" className="h-5 w-5 shrink-0" />
            <span className={`min-w-0 flex-1 truncate ${collapsed ? "lg:hidden" : ""}`}>
              {t.watchlist}
            </span>
            <span
              className={`rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-slate-300 ${
                collapsed ? "lg:hidden" : ""
              }`}
            >
              {count}/{isPro ? "∞" : FEATURED_SYMBOLS.length}
            </span>
          </Link>

          <Link
            href={dashboardViewHref(lang, "simulator")}
            onClick={() => setMobileOpen(false)}
            title={t.simulator}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              view === "simulator"
                ? "bg-gradient-to-r from-blue-500/15 to-purple-500/15 text-white ring-1 ring-purple-400/20"
                : "text-slate-500 hover:bg-white/5 hover:text-slate-200"
            } ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
          >
            <Icon name="simulator" className="h-5 w-5 shrink-0" />
            <span className={`min-w-0 flex-1 truncate ${collapsed ? "lg:hidden" : ""}`}>
              {t.simulator}
            </span>
          </Link>

          <Link
            href={dashboardViewHref(lang, "ai")}
            onClick={() => setMobileOpen(false)}
            title={t.aiAnalysis}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              view === "ai"
                ? "bg-gradient-to-r from-blue-500/15 to-purple-500/15 text-white ring-1 ring-purple-400/20"
                : "text-slate-500 hover:bg-white/5 hover:text-slate-200"
            } ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
          >
            <Icon name="ai" className="h-5 w-5 shrink-0" />
            <span className={`min-w-0 flex-1 truncate ${collapsed ? "lg:hidden" : ""}`}>
              {t.aiAnalysis}
            </span>
          </Link>
        </nav>

        <div className="mt-auto space-y-2 border-t border-white/5 pt-4">
          <div
            className={`flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-2.5 py-2 ${
              collapsed ? "lg:justify-center lg:px-1.5" : ""
            }`}
          >
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide ${
                isPro
                  ? "bg-gradient-to-r from-amber-400/25 to-purple-400/25 text-amber-300 ring-1 ring-amber-300/30"
                  : "bg-white/10 text-slate-300 ring-1 ring-white/10"
              }`}
            >
              {badge}
            </span>
            <div className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
              <p className="truncate text-[11px] font-medium text-slate-300">
                {isPro ? dict[lang].pro.active : dict[lang].user.free}
              </p>
              <p className="truncate text-[9px] text-slate-600">
                {isPro
                  ? lang === "zh"
                    ? "全部功能已解锁"
                    : "All features unlocked"
                  : lang === "zh"
                    ? "升级解锁全部功能"
                    : "Upgrade for full access"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAccount}
            title={t.accountSettings}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 transition hover:bg-white/5 hover:text-slate-200 ${
              collapsed ? "lg:justify-center lg:px-2" : ""
            }`}
          >
            <Icon name="settings" className="h-5 w-5 shrink-0" />
            <span className={`min-w-0 flex-1 truncate text-left ${collapsed ? "lg:hidden" : ""}`}>
              {t.accountSettings}
            </span>
          </button>

          {!isPro && (
            <div onClick={() => setMobileOpen(false)}>
              {collapsed ? (
                <ProUpgradeButton
                  lang={lang}
                  variant="link"
                  label="PRO"
                  source="sidebar"
                  className="w-full justify-center rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-1 py-1"
                />
              ) : (
                <ProUpgradeButton
                  lang={lang}
                  variant="primary"
                  label={t.upgrade}
                  source="sidebar"
                  className="w-full"
                />
              )}
            </div>
          )}

          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[11px] text-slate-600 transition hover:text-slate-300 ${
              collapsed ? "lg:justify-center lg:px-2" : ""
            }`}
            title={t.backToSite}
          >
            <span className={`min-w-0 truncate ${collapsed ? "lg:hidden" : ""}`}>
              ← {t.backToSite}
            </span>
          </Link>
        </div>
      </aside>

      {user && (
        <AccountModal
          key={user.id ?? user.email}
          open={accountOpen}
          onClose={() => setAccountOpen(false)}
          lang={lang}
          user={user}
          ready={ready}
        />
      )}

      <div
        className={`relative z-10 min-w-0 transition-[margin] duration-300 ${
          collapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#05070d]/70 backdrop-blur-xl">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label={t.openMenu}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-purple-500/20 text-slate-300 transition hover:border-purple-500/40 hover:text-white lg:hidden"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
                className="h-5 w-5"
              >
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>

            <StaggerGroup key={`${view}-${lang}`} scroll={false} className="min-w-0 flex-1">
              <Reveal inherit as="p" className="truncate text-[10px] font-medium uppercase tracking-[0.2em] text-purple-400">
                {dict[lang].eyebrow}
              </Reveal>
              <Reveal inherit as="h1" className="mt-1 truncate text-xl font-semibold tracking-tight text-white sm:text-2xl">
                {viewCopy.title}
              </Reveal>
              <Reveal inherit as="p" className="mt-0.5 hidden truncate text-xs text-slate-500 sm:block">
                {viewCopy.subtitle}
              </Reveal>
            </StaggerGroup>

            <Reveal key={`actions-${view}-${lang}`} scroll={false} delay={0.57} className="flex w-full shrink-0 items-center justify-end gap-1.5 sm:w-auto sm:gap-2">
              <LangToggle
                lang={lang}
                path="/dashboard"
                query={`view=${view}`}
              />
              <WatchlistNavButton lang={lang} />
              <UserMenu lang={lang} />
            </Reveal>
          </div>
        </header>

        <main className="min-w-0 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
