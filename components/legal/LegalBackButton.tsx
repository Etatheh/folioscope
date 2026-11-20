"use client";

import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";

export default function LegalBackButton({ lang = "en" }: { lang?: Lang }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.replace("/dashboard");
      }}
      className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-slate-400 backdrop-blur-md transition hover:border-purple-400/30 hover:bg-purple-400/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-400"
    >
      <span aria-hidden="true">←</span>
      {lang === "zh" ? "返回" : "Back"}
    </button>
  );
}
