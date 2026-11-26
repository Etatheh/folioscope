"use client";

import BrandLogo from "@/components/BrandLogo";
import { useLanguage } from "./LanguageProvider";
import LangToggle from "./LangToggle";
import { useState } from "react";
import Link from "next/link";
import UserMenu from "./UserMenu";
import WatchlistNavButton from "./watchlist/WatchlistNavButton";
import { useAuthModal } from "./auth/AuthModalProvider";
import { useSession } from "@/lib/use-session";
import type { Lang } from "@/lib/i18n";

export default function Navbar({ lang: requestedLang }: { lang?: Lang }) {
  const savedLang = useLanguage();
  const lang = requestedLang ?? savedLang;
  const navLinks = [
    { label: lang === "zh" ? "功能" : "Features", href: "/#features" },
    { label: lang === "zh" ? "价格" : "Pricing", href: "/pricing" },
    { label: lang === "zh" ? "博客" : "Blog", href: "/blog" },
    { label: lang === "zh" ? "看板" : "Dashboard", href: "/dashboard" },
  ];
  const [open, setOpen] = useState(false);
  const { user, ready } = useSession();
  const { openAuthModal } = useAuthModal();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 animate-fade-in opacity-0-start">
      <nav className="mx-4 mt-4 rounded-2xl border border-white/10 bg-[#0b0d17]/95 px-6 py-4 shadow-xl shadow-black/20 backdrop-blur-md md:mx-auto md:max-w-5xl">
        <div className="flex items-center justify-between gap-4">

          <Link
            href="/"
            aria-label="FolioScope home"
            className="flex shrink-0 items-center gap-2.5"
          >
            <BrandLogo className="h-8 w-8 shrink-0" />
            <span className="text-sm font-semibold tracking-tight text-white">
              FolioScope
            </span>
          </Link>

          <ul className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-slate-400 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-3 md:flex">
            <LangToggle lang={lang} />
            <WatchlistNavButton lang={lang} />
            {ready && !user && (
              <>
                <button
                  type="button"
                  onClick={() => openAuthModal({ mode: "login", lang })}
                  className="whitespace-nowrap text-sm text-slate-400 transition hover:text-white"
                >
                  {lang === "zh" ? "登录" : "Log in"}
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal({ mode: "signup", lang })}
                  className="btn-primary whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium text-white"
                >
                  {lang === "zh" ? "免费开始" : "Get started"}
                </button>
              </>
            )}
            {ready && user && <UserMenu lang={lang} />}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <WatchlistNavButton lang={lang} />
            <button
              type="button"
              aria-label={lang === "zh" ? "切换菜单" : "Toggle menu"}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-purple-500/20 text-slate-300 transition-colors hover:border-purple-500/40 hover:text-white"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {open ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 md:hidden ${
            open ? "mt-4 max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <ul className="flex flex-col gap-1 border-t border-purple-500/10 pt-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-purple-500/10 hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {ready && !user && (
              <li className="mt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    openAuthModal({ mode: "login", lang });
                  }}
                  className="block w-full whitespace-nowrap rounded-full border border-white/10 px-5 py-2.5 text-center text-sm font-medium text-slate-300 transition hover:border-purple-400/30 hover:text-white"
                >
                  {lang === "zh" ? "登录" : "Log in"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    openAuthModal({ mode: "signup", lang });
                  }}
                  className="block w-full btn-primary whitespace-nowrap rounded-full px-5 py-2.5 text-center text-sm font-medium text-white"
                >
                  {lang === "zh" ? "免费开始" : "Get started"}
                </button>
              </li>
            )}
          </ul>
        </div>
      </nav>
    </header>
  );
}
