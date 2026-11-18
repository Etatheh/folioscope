import Link from "next/link";

const SUBSCRIPTION_LEGAL_LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund", label: "Refund" },
] as const;

export default function LegalInlineLinks({ className = "" }: { className?: string }) {
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
          {link.label}
        </Link>
      ))}
    </div>
  );
}