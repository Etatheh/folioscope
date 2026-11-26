"use client";

import BrandLogo from "@/components/BrandLogo";
import { useLanguage } from "@/components/LanguageProvider";
import LangToggle from "@/components/LangToggle";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import BackgroundEffects from "@/components/BackgroundEffects";
import SiteFooter from "@/components/SiteFooter";
import AuthModal, { type AuthModalMode } from "./AuthModal";

function AuthPageInner({ mode }: { mode: AuthModalMode }) {
  const lang = useLanguage();
  const params = useSearchParams();
  const router = useRouter();
  const requestedRedirect = params.get("redirect");
  const redirect =
    requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : "/dashboard";

  return (
    <div className="relative flex min-h-screen flex-col px-5">
      <BackgroundEffects />

      <header className="relative z-10 mx-auto flex w-full max-w-md items-center pt-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-white transition hover:text-purple-200"
        >
          <BrandLogo />
          FolioScope
        </Link>
        <div className="ml-auto"><LangToggle lang={lang} /></div>
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
 * dialog, so email/password, Google and GitHub never drift between the modal
 * and the full pages.
 */
export default function AuthPage({ mode }: { mode: AuthModalMode }) {
  return (
    <Suspense fallback={null}>
      <AuthPageInner mode={mode} />
    </Suspense>
  );
}
