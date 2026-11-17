"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import {
  highestTier,
  isAdminTier,
  isProTier,
  type AccessTier,
} from "@/lib/access";
import { dict, type Lang } from "@/lib/i18n";
import { logout, type SessionUser } from "@/lib/auth";
import { getSupabaseClient } from "@/lib/supabase/client";
import { showToast } from "@/components/ui/ToastHost";
import UserAvatar from "@/components/ui/UserAvatar";

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function GoogleIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.65 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z"
      />
    </svg>
  );
}

function MailIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
      className={className}
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13M10 11v5M14 11v5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Credits = {
  remaining: number;
  limit: number;
  unlimited: boolean;
};

export default function AccountModal({
  open,
  onClose,
  lang,
  user,
  ready,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  user: SessionUser;
  ready: boolean;
}) {
  const t = dict[lang].account;
  const mounted = useIsClient();
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const nicknameRef = useRef<HTMLInputElement>(null);

  const [nickname, setNickname] = useState(user.name ?? "");
  const [profileEmail, setProfileEmail] = useState(user.email ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl);
  const [tier, setTier] = useState<AccessTier>(
    user?.tier ?? (user?.isAdmin ? "admin" : (user?.plan ?? "free"))
  );
  const [credits, setCredits] = useState<Credits | null>(null);
  const [profileCredits, setProfileCredits] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load the Supabase profile row and the live AI quota when the dialog opens.
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;

    (async () => {
      const supabase = await getSupabaseClient();
      if (!supabase || !user.id) return;

      try {
        const { data } = await supabase
          .from("profiles")
          .select("full_name,email,avatar_url,tier,ai_credits")
          .eq("id", user.id)
          .maybeSingle();

        if (!cancelled && data) {
          if (typeof data.full_name === "string") setNickname(data.full_name);
          if (typeof data.email === "string") setProfileEmail(data.email);
          if (typeof data.avatar_url === "string") setAvatarUrl(data.avatar_url);
          if (
            data.tier === "pro" ||
            data.tier === "free" ||
            data.tier === "admin"
          ) {
            setTier((prev) => highestTier(prev, data.tier));
          }
          if (typeof data.ai_credits === "number") setProfileCredits(data.ai_credits);
        }
      } catch {
        // profiles table unavailable: keep the session values
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const response = await fetch("/api/chat", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        });
        if (!response.ok) return;
        const usage = (await response.json()) as {
          ok?: boolean;
          remaining?: number;
          limit?: number;
          unlimited?: boolean;
          tier?: string;
        };
        if (cancelled || !usage.ok) return;
        if (
          usage.tier === "pro" ||
          usage.tier === "free" ||
          usage.tier === "admin"
        ) {
          setTier((prev) => highestTier(prev, usage.tier));
        }
        if (
          typeof usage.remaining === "number" &&
          typeof usage.limit === "number"
        ) {
          setCredits({
            remaining: usage.remaining,
            limit: usage.limit,
            unlimited: usage.unlimited === true,
          });
        }
      } catch {
        // credits fall back to profiles.ai_credits
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, user]);

  const handleClose = useCallback(() => {
    if (deleting) return;
    setConfirming(false);
    setConfirmText("");
    setDeleteError(null);
    setProfileError(null);
    setSaved(false);
    onClose();
  }, [deleting, onClose]);

  // Escape, scroll lock and focus trap.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => nicknameRef.current?.focus(), 160);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
    };
  }, [open, handleClose]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const name = nickname.trim();
    setProfileError(null);
    setSaved(false);

    if (name.length < 2 || name.length > 32) {
      setProfileError(t.errorNickname);
      return;
    }

    const supabase = await getSupabaseClient();
    if (!supabase || !user?.id) {
      setProfileError(t.errorSupabase);
      return;
    }

    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setProfileError(t.errorSupabase);
        return;
      }

      const token = sessionData.session.access_token;
      if (!token) {
        setProfileError(t.errorSupabase);
        return;
      }

      const response = await fetch("/api/account/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nickname: name, avatarUrl: avatarUrl ?? null }),
      });
      if (!response.ok) throw new Error("profile update failed");

      // Keep Supabase auth metadata in sync so the header/assistant update.
      const { error: metaError } = await supabase.auth.updateUser({
        data: { full_name: name, avatar_url: avatarUrl ?? null },
      });
      if (metaError) throw metaError;

      setNickname(name);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3_000);
    } catch (error) {
      console.error("[account/profile]", error);
      setProfileError(t.errorProfile);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText !== "DELETE" || deleting) return;
    setDeleteError(null);

    const supabase = await getSupabaseClient();
    if (!supabase) {
      setDeleteError(t.errorSupabase);
      return;
    }

    setDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setDeleteError(t.errorSupabase);
        return;
      }

      const { error } = await supabase.rpc("delete_user_account");
      if (error) throw error;

      await supabase.auth.signOut();
      logout();
      onClose();
      showToast(t.deletedToast);
    } catch {
      setDeleteError(t.errorDelete);
    } finally {
      setDeleting(false);
    }
  };

  if (!mounted) return null;

  // Single source of truth: `tier === "pro" || tier === "admin"` unlocks Pro.
  // Merge the session tier with the loaded profile/usage tier; the strongest
  // wins, so ADMIN_EMAILS admins are never downgraded by a stale profile row.
  const sessionTier: AccessTier =
    user?.tier ??
    (user?.isAdmin ? "admin" : user?.plan === "pro" ? "pro" : "free");
  const effectiveTier = highestTier(sessionTier, tier);
  const isAdmin = isAdminTier(effectiveTier);
  const isPro = isProTier(effectiveTier);
  const limit = credits?.limit ?? (isPro ? 200 : 5);
  const remaining = credits?.remaining ?? profileCredits ?? limit;
  const unlimited = credits?.unlimited === true || isAdmin;
  const percent = unlimited
    ? 100
    : limit > 0
      ? Math.max(0, Math.min(100, (remaining / limit) * 100))
      : 0;
  const barTone = unlimited
    ? "from-emerald-400 to-teal-300"
    : remaining <= 0
      ? "from-rose-500 to-orange-400"
      : percent < 25
        ? "from-amber-400 to-orange-400"
        : "from-blue-400 via-purple-400 to-amber-300";
  const providerIsGoogle =
    user?.provider === "google" ||
    Boolean(user?.avatarUrl && /google/i.test(user.avatarUrl));

  const panel = (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
      initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
      transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
      className="glass-panel relative w-full max-w-lg overflow-x-hidden overflow-y-auto rounded-3xl p-6 text-slate-200 sm:p-7"
      style={{
        background:
          "linear-gradient(180deg, rgba(12,17,30,0.97) 0%, rgba(6,9,16,0.985) 100%)",
        maxHeight: "calc(100dvh - 2rem)",
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-purple-500/25 blur-[74px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 bottom-0 h-52 w-52 rounded-full bg-blue-500/18 blur-[74px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 bottom-16 h-36 w-36 rounded-full bg-amber-400/10 blur-[58px]"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <h2
            id="account-modal-title"
            className="text-xl font-semibold tracking-tight text-white sm:text-2xl"
          >
            {t.title}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label={t.close}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg leading-none text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="relative mt-5 space-y-4">
        {/* Profile */}
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-300">
            {t.profile}
          </h3>

          <div className="mt-3 flex items-center gap-3">
            <UserAvatar
              name={nickname || user?.name || ""}
              email={profileEmail || user?.email || ""}
              avatarUrl={avatarUrl}
              lang={lang}
              className="h-14 w-14"
              textClassName="text-lg"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-white">
                  {nickname || user?.name}
                </p>
                {providerIsGoogle && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-slate-400">
                    <GoogleIcon className="h-2.5 w-2.5" />
                    Google
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                {t.avatarHint}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="account-email" className="text-[11px] text-slate-500">
              {t.email}
            </label>
            <div className="relative mt-1">
              <input
                id="account-email"
                type="email"
                value={profileEmail || user?.email || ""}
                readOnly
                aria-readonly="true"
                className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-3.5 pr-24 text-sm text-slate-400 outline-none"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-medium text-slate-400">
                {providerIsGoogle ? (
                  <>
                    <GoogleIcon className="h-2.5 w-2.5" />
                    Google
                  </>
                ) : (
                  <>
                    <MailIcon className="h-2.5 w-2.5" />
                    Email
                  </>
                )}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-slate-600">{t.emailManaged}</p>
          </div>

          <form onSubmit={handleSave} className="mt-4">
            <label htmlFor="account-nickname" className="text-[11px] text-slate-500">
              {t.nickname}
            </label>
            <div className="mt-1 flex gap-2">
              <input
                ref={nicknameRef}
                id="account-nickname"
                type="text"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                maxLength={32}
                placeholder={t.nicknamePlaceholder}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-purple-400/50 focus:bg-white/[0.06]"
              />
              <button
                type="submit"
                disabled={saving || !ready}
                className="btn-primary shrink-0 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? t.saving : saved ? t.saved : t.save}
              </button>
            </div>
            <p className="mt-1 text-[10px] text-slate-600">{t.nicknameHint}</p>
            {profileError && (
              <p role="alert" className="mt-2 text-[11px] text-rose-300">
                {profileError}
              </p>
            )}
            {saved && (
              <p role="status" className="mt-2 text-[11px] text-emerald-300">
                {t.saved}
              </p>
            )}
          </form>
        </section>

        {/* Plan & credits */}
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-300">
              {t.plan}
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide ${
                isAdmin
                  ? "bg-gradient-to-r from-rose-500/30 to-orange-400/30 text-rose-300 ring-1 ring-rose-400/30"
                  : isPro
                    ? "bg-gradient-to-r from-amber-400/25 to-purple-400/25 text-amber-300 ring-1 ring-amber-300/30"
                    : "bg-white/10 text-slate-300 ring-1 ring-white/10"
              }`}
            >
              {isAdmin ? "ADMIN" : isPro ? "PRO" : "FREE"}
            </span>
          </div>

          <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">{t.aiCredits}</span>
              <span className="text-xs font-semibold tabular-nums text-slate-200">
                {unlimited ? "∞" : `${remaining} / ${limit}`}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${barTone} transition-[width] duration-500`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500">
              {isPro ? t.proActive : t.upgrade}
            </p>
            {!isPro && (
              <Link
                href="/pricing"
                onClick={handleClose}
                className="btn-primary inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[11px] font-semibold text-white"
              >
                {t.upgrade}
                <span aria-hidden>→</span>
              </Link>
            )}
            {isPro && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-400/20">
                ✓ {t.proActive}
              </span>
            )}
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.045] p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-300">
            {t.danger}
          </h3>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
            {t.dangerHint}
          </p>

          {!confirming ? (
            <button
              type="button"
              onClick={() => {
                setConfirming(true);
                setConfirmText("");
                setDeleteError(null);
              }}
              className="mt-3 inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-rose-400/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-semibold text-rose-200 transition hover:border-rose-400/50 hover:bg-rose-500/15"
            >
              <TrashIcon />
              {t.delete}
            </button>
          ) : (
            <div className="mt-3 rounded-xl border border-rose-400/25 bg-[#180d12]/60 p-3">
              <p className="text-[11px] font-semibold text-rose-200">
                {t.confirmTitle}
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                {t.confirmHint}
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder={t.confirmPlaceholder}
                autoFocus
                className="mt-2 w-full rounded-lg border border-rose-400/25 bg-black/20 px-3 py-2 text-sm tracking-[0.2em] text-rose-100 outline-none placeholder:tracking-normal placeholder:text-rose-300/30 focus:border-rose-400/50"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={confirmText !== "DELETE" || deleting}
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-rose-600 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-rose-600/30 disabled:text-rose-200/40"
                >
                  <TrashIcon className="h-3 w-3" />
                  {deleting ? t.deleting : t.confirmDelete}
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    setConfirming(false);
                    setConfirmText("");
                    setDeleteError(null);
                  }}
                  className="rounded-lg px-3 py-2 text-[11px] text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
                >
                  {t.cancel}
                </button>
              </div>
              {deleteError && (
                <p role="alert" className="mt-2 text-[11px] text-rose-300">
                  {deleteError}
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="account-modal-backdrop"
          className="fixed inset-0 z-[88] flex items-center justify-center overflow-y-auto bg-[#03060d]/75 px-4 py-8 backdrop-blur-md"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={handleClose}
          role="presentation"
        >
          {panel}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}