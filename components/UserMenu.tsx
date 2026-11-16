"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { useSession } from "@/lib/use-session";
import { dict, type Lang } from "@/lib/i18n";

const CJK = /[㐀-鿿]/;

/** First character for the avatar; in English avoid a CJK glyph (fall back to email). */
function avatarInitial(name: string, email: string, lang: Lang): string {
  const first = name.slice(0, 1);
  if (lang === "en" && CJK.test(first)) {
    return (email.slice(0, 1) || first || "U").toUpperCase();
  }
  return (first || "U").toUpperCase();
}

export default function UserMenu({ lang }: { lang: Lang }) {
  const t = dict[lang].user;
  const { user, ready, mode } = useSession();
  const router = useRouter();

  if (!ready) return null;
  if (!user) {
    return (
      <Link
        href="/login"
        className="btn-primary rounded-xl px-4 py-2 text-xs font-medium text-white"
      >
        {t.login}
      </Link>
    );
  }

  const isAdmin = user.isAdmin === true;
  const isDemo = mode === "local";

  return (
    <div className="flex items-center gap-2">
      {/* Plan / Admin badge */}
      {isAdmin ? (
        <span
          className="rounded-full bg-gradient-to-r from-rose-500/30 to-orange-400/30 px-2 py-0.5 text-[10px] font-bold tracking-wide text-rose-300 ring-1 ring-rose-400/30"
          title={lang === "zh" ? "开发者超级权限" : "Developer superuser"}
        >
          ADMIN
        </span>
      ) : (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            user.plan === "pro"
              ? "bg-gradient-to-r from-amber-400/25 to-purple-400/25 text-amber-300"
              : "bg-white/10 text-slate-400"
          }`}
        >
          {user.plan === "pro" ? t.pro : t.free}
        </span>
      )}

      {/* Demo mode indicator */}
      {isDemo && (
        <span
          className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-cyan-300 ring-1 ring-cyan-400/25"
          title={
            lang === "zh"
              ? "演示模式：账号存储在浏览器 localStorage，非真实后端"
              : "Demo mode: accounts stored in browser localStorage, not a real backend"
          }
        >
          {lang === "zh" ? "演示" : "DEMO"}
        </span>
      )}

      {!isAdmin && user.plan === "free" && (
        <Link
          href="/pricing"
          className="text-[11px] text-purple-400 transition hover:text-purple-300"
        >
          {t.upgrade}
        </Link>
      )}
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold shadow-lg shadow-purple-500/20"
        title={user.email}
      >
        {avatarInitial(user.name, user.email, lang)}
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await fetch("/api/auth/logout", { method: "POST" });
          } catch {
            // ignore network errors; local session is cleared anyway
          }
          logout();
          router.push("/login");
        }}
        title={t.logout}
        className="rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-white/5 hover:text-white"
      >
        {t.logout}
      </button>
    </div>
  );
}
