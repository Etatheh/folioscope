"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import BackgroundEffects from "@/components/BackgroundEffects";
import LangToggle from "@/components/LangToggle";
import SiteFooter from "@/components/SiteFooter";
import { resolveClientLang } from "@/lib/lang-pref";
import AuthModal, { type AuthModalMode } from "./AuthModal";

function AuthPageInner({ mode }: { mode: AuthModalMode }) {
  const params = useSearchParams();
  const router = useRouter();
  const lang = resolveClientLang(params.get("lang"));
  const redirect = params.get("redirect") || "/dashboard";
  const path = mode === "login" ? "/login" : "/register";
  const toggleQuery = params.get("redirect")
    ? `redirect=${encodeURIComponent(params.get("redirect")!)}`
    : undefined;

  return (
    <div className="relative flex min-h-screen flex-col px-5">
      <BackgroundEffects />

      <header className="relative z-10 mx-auto flex w-full max-w-md items-center justify-between pt-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-white transition hover:text-purple-200"
        >
          InDepth
        </Link>
        <LangToggle lang={lang} path={path} query={toggleQuery} />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center py-10">
        <AuthModal
          open
          inline
          lang={lang}
          initialMode={mode}
          redirectTo={redirect}
          onClose={() => router.push("/")}
        />
      </main>

      <div className="relative z-10 mx-auto w-full max-w-md pb-4">
        <SiteFooter compact />
      </div>
    </div>
  );
}

/**
 * Shared shell for the standalone auth routes.
 *
 * `/login` and `/register` both render the same panel as the global auth
 * dialog, so email/password, Google and Microsoft (COMING SOON) never drift
 * between the modal and the full pages.
 */
export default function AuthPage({ mode }: { mode: AuthModalMode }) {
  return (
    <Suspense fallback={null}>
      <AuthPageInner mode={mode} />
    </Suspense>
  );
}