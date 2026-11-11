"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { useSession } from "@/lib/use-session";
import { dict, type Lang } from "@/lib/i18n";

export default function UserMenu({ lang }: { lang: Lang }) {
  const t = dict[lang].user;
  const { user, ready } = useSession();
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

  return (
    <div className="flex items-center gap-2">
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
          user.plan === "pro"
            ? "bg-gradient-to-r from-amber-400/25 to-purple-400/25 text-amber-300"
            : "bg-white/10 text-slate-400"
        }`}
      >
        {user.plan === "pro" ? t.pro : t.free}
      </span>
      {user.plan === "free" && (
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
        {user.name.slice(0, 1).toUpperCase()}
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
