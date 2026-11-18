import BackgroundEffects from "@/components/BackgroundEffects";
import MarkdownArticle from "@/components/MarkdownArticle";
import SiteFooter from "@/components/SiteFooter";
import { getJourneyCategory, getJourneyPost, getJourneyPosts } from "@/lib/journey";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamicParams = false;

export function generateStaticParams() {
  return getJourneyPosts().map((post) => ({
    category: post.category,
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const post = getJourneyPost(category, slug);

  if (!post) {
    return {
      title: "Journey",
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function JourneyPostPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const post = getJourneyPost(category, slug);

  if (!post) {
    notFound();
  }

  const categoryMeta = getJourneyCategory(post.category);

  return (
    <>
      <BackgroundEffects />

      <main className="relative z-10 mx-auto min-h-screen max-w-3xl px-6 py-10 sm:py-16">
        <Link
          href="/journey"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white/75 px-4 py-2 text-sm text-slate-600 shadow-sm backdrop-blur transition-colors hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:text-white"
        >
          ← Back to Journey
        </Link>

        <article className="mt-12 rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-2xl shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:shadow-black/20 sm:p-10">
          <header className="border-b border-slate-200 pb-8 dark:border-white/10">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-blue-500 dark:text-blue-300">
              {categoryMeta?.title ?? post.category}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              {post.title}
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-400">
              {post.excerpt}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <span>{post.date}</span>
              <span aria-hidden="true">·</span>
              <span>{post.readingTime}</span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </header>

          <div className="pt-8">
            <MarkdownArticle content={post.content} />
          </div>
        </article>
      </main>

      <SiteFooter />
    </>
  );
}
