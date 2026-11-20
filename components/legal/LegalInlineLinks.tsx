"use client";
import { useLanguage } from "@/components/LanguageProvider";
import Link from "next/link";

const SUBSCRIPTION_LEGAL_LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund", label: "Refund" },
] as const;

export default function LegalInlineLinks({ className = "" }: { className?: string }) {
  const lang = useLanguage();
  const labels = { "/terms": "条款", "/privacy": "隐私", "/refund": "退款" };
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-slate-500 ${className}`}
    >
      {SUBSCRIPTION_LEGAL_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="transition hover:text-slate-300"
        >
          {lang === "zh" ? labels[link.href] : link.label}
        </Link>
      ))}
    </div>
  );
}