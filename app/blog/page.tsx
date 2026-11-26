import type { Metadata } from "next";
import Link from "next/link";
import { Reveal, StaggerGroup } from "@/components/ui/Reveal";
import { formatPostDate, getAllPosts } from "@/lib/blog";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const description = "Perspectives on portfolio backtesting, market research, and building a clearer investment research workflow with FolioScope.";

export const metadata: Metadata = {
  title: "Blog",
  description,
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: { title: `${SITE_NAME} Blog`, description, url: `${SITE_URL}/blog`, type: "website" },
  twitter: { card: "summary", title: `${SITE_NAME} Blog`, description },
};

export default function BlogPage() {
  const posts = getAllPosts();
  return (
    <>
      <header className="mb-14 max-w-2xl">
        <p className="mb-5 text-sm tracking-widest text-violet-300">THE FOLIOSCOPE BLOG</p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 sm:text-6xl">
          A clearer <span className="gradient-text">perspective.</span>
        </h1>
        <p className="mt-6 text-lg leading-8 text-zinc-400">Ideas, guides, and research notes for exploring portfolios and understanding the bigger picture.</p>
      </header>
      <section aria-label="Latest articles"><StaggerGroup className="grid gap-6 sm:grid-cols-2">
        {posts.map(({ slug, meta }) => (
          <Reveal inherit as="article" key={slug} className="flex flex-col rounded-2xl border border-white/10 bg-zinc-900/50 p-7 transition-colors hover:border-violet-400/40 sm:p-8">
            <time dateTime={meta.date} className="text-sm text-zinc-400">{formatPostDate(meta.date)}</time>
            <h2 className="mt-4 text-2xl leading-snug font-semibold tracking-tight text-zinc-50">
              <Link href={`/blog/${slug}`} className="transition-colors hover:text-violet-300">{meta.title}</Link>
            </h2>
            <p className="mt-4 mb-8 leading-7 text-zinc-400">{meta.description}</p>
            <Link href={`/blog/${slug}`} aria-label={`Read ${meta.title}`} className="mt-auto w-fit text-sm font-medium text-violet-300 transition-colors hover:text-violet-200">Read article →</Link>
          </Reveal>
        ))}
        {posts.length === 0 && <p className="text-zinc-400">Research notes are on their way. Check back soon.</p>}
      </StaggerGroup></section>
    </>
  );
}
