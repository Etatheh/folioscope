import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import BlogBacktestEmbed from "@/components/blog/BlogBacktestEmbed";
import { formatPostDate, getAllPosts, getPostBySlug } from "@/lib/blog";
import { SITE_NAME, SITE_URL } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();
  const { meta } = post;
  return {
    title: { absolute: meta.title },
    description: meta.description,
    alternates: { canonical: `${SITE_URL}/blog/${slug}` },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${SITE_URL}/blog/${slug}`,
      siteName: SITE_NAME,
      type: "article",
      publishedTime: `${meta.date}T00:00:00Z`,
      tags: meta.tags,
    },
    twitter: { card: "summary", title: meta.title, description: meta.description },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();
  const { meta, content } = post;
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/blog" className="text-sm text-zinc-400 transition-colors hover:text-violet-300">← Back to Blog</Link>
      <article className="mt-10">
        <header className="mb-12 border-b border-white/10 pb-10">
          <time dateTime={meta.date} className="text-sm text-zinc-400">{formatPostDate(meta.date)}</time>
          <h1 className="mt-5 text-4xl leading-tight font-semibold tracking-tight text-zinc-50 sm:text-5xl">{meta.title}</h1>
          <p className="mt-6 text-lg leading-8 text-zinc-400">{meta.description}</p>
          {meta.tags.length > 0 && <ul aria-label="Tags" className="mt-6 flex flex-wrap gap-2">
            {meta.tags.map(tag => <li key={tag} className="rounded-full border border-violet-400/20 bg-violet-400/5 px-3 py-1 text-sm text-violet-300">{tag}</li>)}
          </ul>}
        </header>
        <div className="prose prose-invert prose-zinc max-w-none prose-headings:tracking-tight prose-a:text-violet-300 prose-a:decoration-violet-400/40 prose-pre:border prose-pre:border-white/10 prose-pre:bg-zinc-900">
          <MDXRemote source={content} components={{ BlogBacktestEmbed }} />
        </div>
      </article>
      <aside aria-labelledby="blog-cta" className="mt-16 rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-zinc-900/70 p-8 sm:p-10">
        <p className="text-sm tracking-widest text-violet-300">FROM IDEAS TO RESEARCH</p>
        <h2 id="blog-cta" className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50">Put your perspective to the test.</h2>
        <p className="mt-3 leading-7 text-zinc-400">Explore {meta.ctaTicker} in FolioScope and use historical data to examine your assumptions.</p>
        <Link href={`/dashboard?ticker=${encodeURIComponent(meta.ctaTicker)}`} className="btn-primary mt-7 inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white">Simulate this in FolioScope →</Link>
      </aside>
    </div>
  );
}
