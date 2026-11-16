"use client";

import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { setLangCookie } from "@/lib/lang-pref";

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
  const href = (l: Lang) => {
    const extra = query ? `&${query}` : "";
    if (l === "zh") return `${path}?lang=zh${extra}`;
    return query ? `${path}?${query}` : path;
  };
  const base = "rounded-full px-2.5 py-1 text-[11px] transition";
  const pick = (l: Lang) => () => setLangCookie(l);
  return (
    <div className="flex items-center rounded-full border border-white/10 bg-white/[0.03] p-0.5">
      <Link
        href={href("zh")}
        onClick={pick("zh")}
        className={`${base} ${
          lang === "zh"
            ? "bg-gradient-to-r from-blue-500/25 to-purple-500/25 text-white"
            : "text-slate-500 hover:text-slate-200"
        }`}
      >
        中文
      </Link>
      <Link
        href={href("en")}
        onClick={pick("en")}
        className={`${base} ${
          lang === "en"
            ? "bg-gradient-to-r from-blue-500/25 to-purple-500/25 text-white"
            : "text-slate-500 hover:text-slate-200"
        }`}
      >
        EN
      </Link>
    </div>
  );
}
