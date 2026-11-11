import Link from "next/link";
import type { Lang } from "@/lib/i18n";

export default function LangToggle({ lang, path }: { lang: Lang; path: string }) {
  const href = (l: Lang) => (l === "zh" ? `${path}?lang=zh` : path);
  const base =
    "rounded-full px-2.5 py-1 text-[11px] transition";
  return (
    <div className="flex items-center rounded-full border border-white/10 bg-white/[0.03] p-0.5">
      <Link
        href={href("zh")}
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
