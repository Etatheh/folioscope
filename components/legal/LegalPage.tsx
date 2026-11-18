import type { ReactNode } from "react";

import BackgroundEffects from "@/components/BackgroundEffects";
import SiteFooter from "@/components/SiteFooter";
import Navbar from "@/components/Navbar";

export default function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <BackgroundEffects />
      <Navbar />

      <main className="relative z-10 mx-auto max-w-3xl px-5 pb-20 pt-32 sm:px-6 sm:pt-40">
        <article className="glass rounded-3xl border-white/10 p-6 sm:p-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-purple-300">
            FolioScope · Legal
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-xs text-slate-500">
            Effective Date: November 18, 2026
          </p>

          <div className="mt-8 space-y-6 text-sm leading-7 text-slate-400 [&_a]:text-purple-300 [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-9 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-white [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_p]:leading-7 [&_strong]:text-slate-200 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
            {children}
          </div>
        </article>
      </main>

      <SiteFooter />
    </>
  );
}