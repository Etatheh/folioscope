"use client";
import type { Lang } from "@/lib/i18n";
import { setLangCookie } from "@/lib/lang-pref";

/** Reload to reset transient AI/modal state to the explicitly selected locale. */
export default function LangToggle({ lang, path, query }: { lang: Lang; path?: string; query?: string }) {
  const next: Lang = lang === "zh" ? "en" : "zh";
  return <button type="button" onClick={() => {
    setLangCookie(next);
    const url = new URL(window.location.href);
    if (path) url.pathname = path;
    if (query !== undefined) url.search = query;
    url.searchParams.delete("lang");
    window.location.assign(url.pathname + url.search + url.hash);
  }} aria-label={lang === "zh" ? "切换到英文" : "Switch to Chinese"}
    title={lang === "zh" ? "切换到英文" : "Switch to Chinese"}
    className="glass inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[11px] font-semibold tracking-wide text-slate-300 transition hover:border-purple-400/40 hover:text-white">
    <span aria-hidden className="text-[12px] leading-none">🌐</span>
    <span>{lang === "zh" ? "ZH" : "EN"}</span>
  </button>;
}
