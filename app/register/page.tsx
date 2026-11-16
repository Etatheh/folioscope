"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BackgroundEffects from "@/components/BackgroundEffects";
import LangToggle from "@/components/LangToggle";
import { register } from "@/lib/auth";
import { resolveClientLang } from "@/lib/lang-pref";

function DemoBanner({ lang }: { lang: "zh" | "en" }) {
  return (
    <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07] px-4 py-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-[10px] font-bold text-cyan-300">
        i
      </span>
      <div className="text-xs leading-relaxed text-cyan-200/80">
        <p className="font-semibold text-cyan-300">
          {lang === "zh" ? "演示模式" : "Demo Mode"}
        </p>
        <p className="mt-0.5">
          {lang === "zh"
            ? "数据库未配置，账号仅存储在当前浏览器的 localStorage 中。注册后请记住密码，换一个浏览器或清空缓存会丢失账号。"
            : "Database not configured. Accounts are stored in this browser's localStorage only. Remember your password — switching browsers or clearing cache will lose the account."}
        </p>
      </div>
    </div>
  );
}

function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/dashboard";
  const lang = resolveClientLang(params.get("lang"));
  const toggleQuery = params.get("redirect")
    ? `redirect=${encodeURIComponent(params.get("redirect")!)}`
    : undefined;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!cancelled && res.status === 503) setDemoMode(true);
      } catch {
        if (!cancelled) setDemoMode(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, nickname: name, lang }),
      });
      if (res.status === 503) {
        setDemoMode(true);
        const local = register(email, name, password);
        if (local.ok) {
          router.push(redirect);
          return;
        }
        setError(local.error);
        setBusy(false);
        return;
      }
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        router.push(redirect);
        return;
      }
      setError(data.error ?? "Sign up failed");
    } catch {
      setError("Network error, please try again");
    }
    setBusy(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-5">
      <BackgroundEffects />
      <div className="glass relative z-10 w-full max-w-md rounded-2xl p-8">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-white">
            {lang === "zh" ? "创建账号" : "Create account"}
          </h1>
          <LangToggle lang={lang} path="/register" query={toggleQuery} />
        </div>

        {demoMode && <DemoBanner lang={lang} />}

        {!demoMode && (
          <p className="mt-1 text-xs text-slate-500">
            {lang === "zh"
              ? "免费注册开始使用，无需信用卡。"
              : "Free to start. No credit card required."}
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs text-slate-500">
              {lang === "zh" ? "昵称" : "Nickname"}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              placeholder={lang === "zh" ? "你的名字" : "Your name"}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-purple-400/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">
              {lang === "zh" ? "邮箱" : "Email"}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-purple-400/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">
              {lang === "zh" ? "密码（至少 6 位）" : "Password (min 6 characters)"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-purple-400/50"
            />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full rounded-xl py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy
              ? lang === "zh" ? "注册中…" : "Creating…"
              : lang === "zh" ? "免费注册" : "Sign up free"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          {lang === "zh" ? "已有账号？" : "Already have an account?"}{" "}
          <Link href="/login" className="text-purple-400 hover:text-purple-300">
            {lang === "zh" ? "登录" : "Log in"}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}