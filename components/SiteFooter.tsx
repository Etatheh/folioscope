import Link from "next/link";

import {
  LEGAL_LINKS,
  SITE_DISCLAIMER,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";

export default function SiteFooter({ compact = false }: { compact?: boolean }) {
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
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="max-w-3xl text-[11px] leading-relaxed text-slate-500">
            {SITE_DISCLAIMER}
          </p>

          <p className="text-[11px] text-slate-600">
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
            {" · "}
            <a
              href={SITE_URL}
              className="transition hover:text-slate-400"
              rel="noreferrer"
              target="_blank"
            >
              folioscope.live
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}