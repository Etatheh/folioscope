"use client";

import BrandLogo from "@/components/BrandLogo";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { dict, type Lang } from "@/lib/i18n";
import { legalDocs, type LegalDocId } from "@/lib/legal";
import { login as localLogin, register as localRegister } from "@/lib/auth";
import { getSupabaseClient } from "@/lib/supabase/client";
import { OAUTH_CALLBACK_URL } from "@/lib/site";

export type AuthModalMode = "login" | "signup";

type View = "auth" | LegalDocId;

const emptySubscribe = () => () => {};

/** True only after hydration — keeps the portal out of the server render. */
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

/** Standard four-colour Google mark. */
function GoogleIcon({ className = "h-4 w-4" }: { className?: string }) {
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

/** GitHub mark. */
function GitHubIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path fill="currentColor" d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function mapAuthError(message: string): keyof typeof dict.en.auth.errors {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid credentials")) {
    return "invalidCredentials";
  }
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "emailTaken";
  }
  if (m.includes("email not confirmed")) return "emailNotConfirmed";
  if (m.includes("password") && m.includes("at least")) return "weakPassword";
  if (m.includes("rate limit") || m.includes("too many")) return "rateLimited";
  if (m.includes("invalid email") || m.includes("email address")) return "invalidEmail";
  return "generic";
}

export default function AuthModal({
  open,
  onClose,
  initialMode = "login",
  inline = false,
  redirectTo,
}: {
  open: boolean;
  onClose: () => void;
  /** Kept for API compatibility; auth UI is English-only. */
  lang: Lang;
  initialMode?: AuthModalMode;
  /** Render the panel inline (used by /login and /register) instead of a portal. */
  inline?: boolean;
  /** After a successful auth, refresh and navigate here instead of just closing. */
  redirectTo?: string;
}) {
  // English-first auth flow. Existing Chinese copy is frozen and not rendered.
  const authLang: Lang = "en";
  const t = dict[authLang].auth;
  const router = useRouter();
  const mounted = useIsClient();
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<View>("auth");
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "google" | "github" | "email">(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const doc = view === "auth" ? null : legalDocs[authLang][view];

  const handleClose = useCallback(() => {
    // OAuth redirects are in flight; don't let the dialog disappear mid-flow.
    if (busy === "google" || busy === "github") return;
    onClose();
  }, [busy, onClose]);

  // Escape to close, lock background scroll, keep focus inside the dialog.
  // Inline auth pages behave like normal pages, so keep their scroll usable.
  useEffect(() => {
    if (!open || inline) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
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
    const focusTimer = window.setTimeout(() => emailRef.current?.focus(), 120);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [open, handleClose, inline]);

  const finish = useCallback(
    (destination?: string) => {
      const target = destination?.trim();
      // Auth pages must refresh the server session before leaving for the
      // dashboard; the modal keeps its existing close-and-refresh behavior.
      if (target) {
        // Close the global dialog first so it does not survive the route push.
        if (!inline) onClose();
        router.refresh();
        router.push(target);
        return;
      }
      onClose();
      router.refresh();
    },
    [inline, onClose, router]
  );

  const handleOAuth = useCallback(
    async (provider: "google" | "github") => {
      setError(null);
      setNotice(null);
      setBusy(provider);
      try {
        const supabase = await getSupabaseClient();
        if (!supabase) {
          setError(t.errors.notConfigured);
          setBusy(null);
          return;
        }
        const next = redirectTo?.trim() || "/dashboard";
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${OAUTH_CALLBACK_URL}?next=${encodeURIComponent(next)}`,
          },
        });
        if (oauthError) {
          setError(t.errors.oauth);
          setBusy(null);
        }
        // On success the browser is redirected to the provider, so keep busy.
      } catch {
        setError(t.errors.oauth);
        setBusy(null);
      }
    },
    [redirectTo, t]
  );

  const handleGoogle = useCallback(() => {
    void handleOAuth("google");
  }, [handleOAuth]);

  const handleGithub = useCallback(() => {
    void handleOAuth("github");
  }, [handleOAuth]);

  const handleEmailAuth = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (busy) return;
      setError(null);
      setNotice(null);

      const localizeLegacyError = (message: string) => {
        if (message.includes("已注册")) return t.errors.emailTaken;
        if (message.includes("尚未注册") || message.includes("密码不正确")) {
          return t.errors.invalidCredentials;
        }
        if (message.includes("密码至少")) return t.errors.weakPassword;
        if (message.includes("邮箱")) return t.errors.invalidEmail;
        return /[㐀-鿿]/.test(message) ? t.errors.generic : message;
      };

      const cleanEmail = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setError(t.errors.invalidEmail);
        return;
      }
      if (password.length < 6) {
        setError(t.errors.weakPassword);
        return;
      }

      setBusy("email");
      try {
        if (process.env.NODE_ENV === "development" && mode === "login" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
          const localResponse = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: cleanEmail, password, lang: authLang }),
          });
          if (localResponse.ok) {
            window.location.assign(redirectTo || "/dashboard");
            return;
          }
        }
        const supabase = await getSupabaseClient();
        if (supabase) {
          if (mode === "login") {
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password,
            });
            if (signInError) {
              setError(t.errors[mapAuthError(signInError.message)]);
              return;
            }
            finish(redirectTo);
            return;
          }

          const { data, error: signUpError } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: { data: { full_name: cleanEmail.split("@")[0] } },
          });
          if (signUpError) {
            setError(t.errors[mapAuthError(signUpError.message)]);
            return;
          }
          if (data.session) {
            finish(redirectTo ?? "/dashboard");
            return;
          }
          setNotice(t.confirmEmail);
          setMode("login");
          setPassword("");
          return;
        }

        // Fallback: existing cookie/local auth when Supabase is unconfigured.
        const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
        const body =
          mode === "login"
            ? { email: cleanEmail, password, lang: authLang }
            : {
                email: cleanEmail,
                password,
                nickname: cleanEmail.split("@")[0] || "User",
                lang: authLang,
              };
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (response.status === 503) {
          const local =
            mode === "login"
              ? localLogin(cleanEmail, password)
              : localRegister(
                  cleanEmail,
                  cleanEmail.split("@")[0].padEnd(2, "u") || "User",
                  password
                );
          if (local.ok) {
            finish(mode === "signup" ? (redirectTo ?? "/dashboard") : redirectTo);
            return;
          }
          setError(localizeLegacyError(local.error));
          return;
        }

        const data = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
        };
        if (response.ok && data.ok) {
          finish(mode === "signup" ? (redirectTo ?? "/dashboard") : redirectTo);
          return;
        }
        setError(data.error ? localizeLegacyError(data.error) : t.errors.generic);
      } catch {
        setError(t.errors.network);
      } finally {
        setBusy(null);
      }
    },
    [busy, email, finish, mode, password, redirectTo, t]
  );

  const legalNotice = useMemo(
    () => (
      <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-500">
        {t.legal.pre}
        <button
          type="button"
          onClick={() => setView("terms")}
          className="text-slate-300 underline decoration-white/20 decoration-dotted underline-offset-2 transition hover:text-purple-300"
        >
          {t.legal.terms}
        </button>
        {t.legal.between1}
        <button
          type="button"
          onClick={() => setView("privacy")}
          className="text-slate-300 underline decoration-white/20 decoration-dotted underline-offset-2 transition hover:text-purple-300"
        >
          {t.legal.privacy}
        </button>
        {t.legal.between2}
        <button
          type="button"
          onClick={() => setView("disclaimer")}
          className="text-slate-300 underline decoration-white/20 decoration-dotted underline-offset-2 transition hover:text-purple-300"
        >
          {t.legal.disclaimer}
        </button>
        {t.legal.post}
      </p>
    ),
    [t]
  );

  if (!mounted && !inline) return null;

  const authView = (
    <motion.div
      key={`auth-${mode}`}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <h2
        id="auth-modal-title"
        className="mt-4 text-xl font-semibold tracking-tight text-white sm:text-2xl"
      >
        {mode === "login" ? t.loginTitle : t.signupTitle}
      </h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">
        {mode === "login" ? t.loginSubtitle : t.signupSubtitle}
      </p>

      <div className="mt-5 space-y-2.5">
        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy !== null}
          className="flex w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-white/25 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleIcon className="h-[18px] w-[18px] shrink-0" />
          <span>{t.google}</span>
        </button>

        <button
          type="button"
          onClick={handleGithub}
          disabled={busy !== null}
          className="flex w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-white/25 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GitHubIcon className="h-[18px] w-[18px] shrink-0" />
          <span>{t.github}</span>
        </button>
      </div>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/10" />
        <span className="whitespace-nowrap text-[10px] tracking-[0.16em] text-slate-500">
          {mode === "login" ? t.orEmail : t.orEmailSignup}
        </span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleEmailAuth} className="space-y-3">
        <div>
          <label htmlFor="auth-email" className="text-[11px] text-slate-500">
            {t.email}
          </label>
          <input
            ref={emailRef}
            id="auth-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t.emailPlaceholder}
            required
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-purple-400/50 focus:bg-white/[0.06]"
          />
        </div>
        <div>
          <label htmlFor="auth-password" className="text-[11px] text-slate-500">
            {t.password}
          </label>
          <input
            id="auth-password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t.passwordPlaceholder}
            required
            minLength={6}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-purple-400/50 focus:bg-white/[0.06]"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-[11px] leading-relaxed text-rose-300">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-lg bg-emerald-500/10 px-3 py-2 text-[11px] leading-relaxed text-emerald-300">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy !== null}
          className="btn-primary w-full whitespace-nowrap rounded-xl py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === "email"
            ? mode === "login"
              ? t.loginBusy
              : t.signupBusy
            : mode === "login"
              ? t.loginCta
              : t.signupCta}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-500">
        {mode === "login" ? t.noAccount : t.haveAccount}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setNotice(null);
            setPassword("");
          }}
          className="font-medium text-purple-300 transition hover:text-purple-200"
        >
          {mode === "login" ? t.toSignup : t.toLogin}
        </button>
      </p>

      {legalNotice}
    </motion.div>
  );

  const legalView = doc && view !== "auth" && (
    <motion.div
      key={view}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <button
        type="button"
        onClick={() => setView("auth")}
        className="mt-1 inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] text-slate-400 transition hover:text-white"
      >
        <span aria-hidden>←</span>
        {t.legalBack}
      </button>

      <h2
        id="auth-modal-title"
        className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-[22px]"
      >
        {doc.title}
      </h2>
      <p className="mt-1 text-[11px] text-slate-500">
        {t.legalUpdated} {doc.updated}
      </p>
      <p className="mt-3 text-[13px] leading-relaxed text-slate-400">{doc.summary}</p>

      <div className="auth-legal-scroll mt-4 max-h-[44vh] space-y-4 overflow-y-auto pr-2">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h3 className="text-[13px] font-semibold text-slate-200">{section.heading}</h3>
            {section.paragraphs.map((paragraph) => (
              <p
                key={paragraph.slice(0, 32)}
                className="mt-1.5 text-[12px] leading-relaxed text-slate-400"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setView("auth")}
        className="btn-primary mt-5 w-full whitespace-nowrap rounded-xl py-3 text-sm font-semibold text-white"
      >
        {t.legalBack}
      </button>
    </motion.div>
  );

  const panel = (
    <motion.div
      ref={panelRef}
      role={inline ? undefined : "dialog"}
      aria-modal={inline ? undefined : true}
      aria-labelledby="auth-modal-title"
      initial={reduceMotion ? false : { opacity: 0, y: 22, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
      transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
      className="glass-panel relative w-full max-w-[460px] overflow-hidden rounded-3xl p-6 text-slate-200 sm:p-7"
      onClick={(event) => event.stopPropagation()}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-purple-500/25 blur-[74px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 bottom-0 h-52 w-52 rounded-full bg-blue-500/20 blur-[74px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 bottom-10 h-36 w-36 rounded-full bg-amber-400/10 blur-[58px]"
      />

      <div className="relative flex items-start justify-between gap-3">
        <BrandLogo className="h-9 w-9 shrink-0" title="FolioScope" />
        <button
          type="button"
          onClick={handleClose}
          aria-label={t.close}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg leading-none text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="relative">
        <AnimatePresence mode="wait" initial={false}>
          {view === "auth" ? authView : legalView}
        </AnimatePresence>
      </div>
    </motion.div>
  );

  if (inline) {
    return <div className="w-full max-w-[460px]">{panel}</div>;
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="auth-modal-backdrop"
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#03060d]/75 px-4 py-8 backdrop-blur-md"
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
