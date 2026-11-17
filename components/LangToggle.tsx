"use client";

import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { setLangCookie } from "@/lib/lang-pref";

/**
 * Compact one-tap language switch (🌐 EN / 🌐 中).
 *
 * It shows the language currently in use; clicking writes the cookie and
 * navigates to the same page in the other language.
 */
export default function LangToggle({
  lang,
  path,
  query,
}: {
  lang: Lang;
  path: string;
  /** Extra query string (without leading ?) to preserve, e.g. "redirect=/dashboard". */
  query?: string;
}) {
  const next: Lang = lang === "zh" ? "en" : "zh";

  const href = (l: Lang) => {
    const extra = query ? `&${query}` : "";
    if (l === "zh") return `${path}?lang=zh${extra}`;
    return query ? `${path}?${query}` : path;
  };

  return (
    <Link
      href={href(next)}
      onClick={() => setLangCookie(next)}
      aria-label={lang === "zh" ? "Switch to English" : "切换到中文"}
      title={lang === "zh" ? "Switch to English" : "切换到中文"}
      className="glass inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[11px] font-semibold tracking-wide text-slate-300 transition hover:border-purple-400/40 hover:text-white"
    >
      <span aria-hidden className="text-[12px] leading-none">
        🌐
      </span>
      <span>{lang === "zh" ? "中" : "EN"}</span>
    </Link>
  );
}