"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { logout, type SessionUser } from "@/lib/auth";
import { isAdminTier, type AccessTier } from "@/lib/access";
import { useProfile } from "@/lib/use-profile";
import { useSession } from "@/lib/use-session";
import { dict, type Lang } from "@/lib/i18n";
import { signOutOfSupabase } from "@/lib/supabase/client";
import { useAuthModal } from "./auth/AuthModalProvider";
import AccountModal from "./account/AccountModal";
import UserAvatar from "./ui/UserAvatar";

function displayName(user: SessionUser): string {
  const name = user.name?.trim();
  if (name) return name;
  return user.email.split("@")[0] || user.email || "User";
}

function planBadge(tier: AccessTier, lang: Lang) {
  const t = dict[lang].user;
  if (isAdminTier(tier)) {
    return {
      label: "ADMIN",
      className:
        "bg-gradient-to-r from-rose-500/30 to-orange-400/30 text-rose-300 ring-1 ring-rose-400/30",
    };
  }
  if (tier === "pro") {
    return {
      label: t.planPro,
      className:
        "bg-gradient-to-r from-amber-400/25 to-purple-400/25 text-amber-300 ring-1 ring-amber-300/30",
    };
  }
  return {
    label: t.planFree,
    className: "bg-white/10 text-slate-300 ring-1 ring-white/10",
  };
}

export default function UserMenu({ lang }: { lang: Lang }) {
  const t = dict[lang].user;
  const { user, ready, mode } = useSession();
  const { profile } = useProfile();
  const { openAuthModal } = useAuthModal();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountNonce, setAccountNonce] = useState(0);
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

  if (!ready) {
    return <div className="h-9 w-20 animate-pulse rounded-full bg-white/[0.06]" aria-hidden />;
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => openAuthModal({ mode: "login", lang })}
        className="btn-primary inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-xs font-medium text-white"
      >
        {t.login}
      </button>
    );
  }

  // Prefer the live profile tier (includes `profiles.tier === "admin"`), and
  // fall back to the session flags while the profile row is loading.
  const tier: AccessTier =
    profile?.tier ??
    user.tier ??
    (user.isAdmin ? "admin" : user.plan === "pro" ? "pro" : "free");
  const badge = planBadge(tier, lang);
  const name = displayName(user);
  const isDemo = mode === "local";

  const handleSignOut = async () => {
    setOpen(false);
    try {
      await signOutOfSupabase();
    } catch {
      // ignore — the legacy session still needs clearing
    }
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors; local session is cleared anyway
    }
    logout();
    router.push("/");
    router.refresh();
  };

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.menuLabel}
        className={`glass flex h-9 items-center gap-2 whitespace-nowrap rounded-full py-1 pl-1 pr-2 transition ${
          open ? "border-purple-400/40 text-white" : "hover:border-purple-400/30"
        }`}
      >
        <UserAvatar
          name={user.name}
          email={user.email}
          avatarUrl={user.avatarUrl}
          lang={lang}
        />
        <span className="hidden max-w-[92px] truncate text-xs font-medium text-slate-200 sm:block">
          {name}
        </span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${badge.className}`}
        >
          {badge.label}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          className={`h-3 w-3 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t.menuLabel}
          style={{ background: "#090d16" }}
          className="glass-panel absolute right-0 z-[60] mt-2 w-64 overflow-hidden rounded-2xl p-1.5 text-slate-200 shadow-2xl shadow-black/60"
        >
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
            <UserAvatar
              name={user.name}
              email={user.email}
              avatarUrl={user.avatarUrl}
              lang={lang}
              className="h-10 w-10"
              textClassName="text-sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{name}</p>
              <p className="truncate text-[11px] text-slate-500">{user.email}</p>
              {isDemo && (
                <span
                  className="mt-1 inline-flex rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-cyan-300 ring-1 ring-cyan-400/25"
                  title={
                    lang === "zh"
                      ? "演示模式：账号存储在浏览器 localStorage"
                      : "Demo mode: account stored in browser localStorage"
                  }
                >
                  {lang === "zh" ? "演示" : "DEMO"}
                </span>
              )}
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>

          <div className="mx-1 my-1 h-px bg-white/10" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setAccountNonce((value) => value + 1);
              setAccountOpen(true);
            }}
            className="flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-lg px-2.5 py-2.5 text-left text-xs text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
                className="h-3.5 w-3.5"
              >
                <path
                  d="M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t.accountPlan}
            </span>
            <span aria-hidden className="text-slate-600">
              →
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-2.5 text-left text-xs text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-200"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
              className="h-3.5 w-3.5"
            >
              <path
                d="M15 17l5-5-5-5M20 12H9M12 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t.signOut}
          </button>
        </div>
      )}
      <AccountModal
        key={accountNonce}
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        lang={lang}
        user={user}
        ready={ready}
      />
    </div>
  );
}