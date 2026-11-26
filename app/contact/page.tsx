import BrandLogo from "@/components/BrandLogo";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import ContactContent from "./ContactContent";

const description = "Questions, feedback, or an idea for FolioScope? Get in touch with us directly.";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Contact",
  description,
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: { title: `Contact ${SITE_NAME}`, description, url: `${SITE_URL}/contact`, type: "website" },
  twitter: { card: "summary", title: `Contact ${SITE_NAME}`, description },
};

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-screen max-w-5xl px-6 pt-36 pb-24 sm:px-8 sm:pt-44">
        <header className="mb-14 max-w-2xl">
          <p className="mb-5 flex items-center gap-3 text-sm tracking-widest text-violet-300"><BrandLogo className="h-10 w-10 shrink-0" />CONTACT FOLIOSCOPE</p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 sm:text-6xl">
            Get in <span className="gradient-text">touch.</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-400">
            A question, a fresh idea, or a little feedback. We’re listening.
          </p>
        </header>
        <ContactContent />
      </main>
      <SiteFooter />
    </>
  );
}
