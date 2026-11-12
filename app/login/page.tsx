"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BackgroundEffects from "@/components/BackgroundEffects";
import { login } from "@/lib/auth";

function browserLang(): "zh" | "en" {
  if (typeof navigator === "undefined") return "en";
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/dashboard";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, lang: browserLang() }),
      });
      if (res.status === 503) {
        // Supabase not configured: use the local demo accounts
        const local = login(email, password);
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
      setError(data.error ?? "Login failed");
    } catch {
      setError("Network error, please try again");
    }
    setBusy(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-5">
      <BackgroundEffects />
      <div className="glass relative z-10 w-full max-w-md rounded-2xl p-8">
        <h1 className="text-2xl font-semibold text-white">Log in</h1>
        <p className="mt-1 text-xs text-slate-500">
          Preview: accounts live in the local demo store until Supabase is
          configured.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs text-slate-500">Email</label>
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
            <label className="text-xs text-slate-500">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
            {busy ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          No account?{" "}
          <Link href="/register" className="text-purple-400 hover:text-purple-300">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
