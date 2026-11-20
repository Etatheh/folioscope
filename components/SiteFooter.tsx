"use client";
import { useLanguage } from "./LanguageProvider";
import Link from "next/link";

import {
  CONTACT_EMAIL,
  LEGAL_LINKS,
  SITE_DISCLAIMER,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";

export default function SiteFooter({ compact = false }: { compact?: boolean }) {
  const lang = useLanguage();
  const zh = lang === "zh";
  const labels: Record<string, string> = { "/terms": "服务条款", "/privacy": "隐私政策", "/refund": "退款政策", "/disclaimer": "免责声明" };
  return (
    <footer
      className={`relative z-10 border-t border-purple-500/10 ${
        compact ? "mt-8 py-6" : "mt-16 py-10"
      }`}
    >
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <nav
            aria-label="Legal"
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-400"
          >
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition hover:text-white"
              >
                {zh ? labels[link.href] : link.label}
              </Link>
            ))}
          </nav>

          <p className="max-w-3xl text-[11px] leading-relaxed text-slate-500">
            {zh ? "FolioScope 是教育与量化研究工具。数据、回测和 AI 摘要仅供信息参考，不构成投资建议。" : SITE_DISCLAIMER}
          </p>

          <p className="text-[11px] text-slate-600">
            © {new Date().getFullYear()} {SITE_NAME}. {zh ? "保留所有权利。" : "All rights reserved."}
            {" · "}
            <a
              href={SITE_URL}
              className="transition hover:text-slate-400"
              rel="noreferrer"
              target="_blank"
            >
              folioscope.live
            </a>
            {" · "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="transition hover:text-slate-400">
              Contact: {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}