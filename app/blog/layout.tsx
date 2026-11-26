import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";

// Blog content is built from trusted, repository-owned MDX. Cookie-based
// personalization in the shared root layout must not make these routes dynamic.
export const dynamic = "force-static";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-screen max-w-5xl px-6 pt-36 pb-24 sm:px-8 sm:pt-44">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
