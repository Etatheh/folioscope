import BackgroundEffects from "@/components/BackgroundEffects";
import Navbar from "@/components/Navbar";
import { getJourneyPosts, journeyCategories } from "@/lib/journey";
import Link from "next/link";

export const metadata = {
  title: "Journey | GUI",
  description: "Learning notes, coding logs, investment thinking, and personal reflections.",
};

export default function JourneyPage() {
  const posts = getJourneyPosts();
  const latestPost = posts[0];

  return (
    <>
      <BackgroundEffects />
      <Navbar />

      <main className="relative z-10 mx-auto min-h-screen max-w-6xl px-6 pb-24 pt-32 sm:pt-40">
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-blue-500 dark:text-blue-300">
            Journey / Space
          </p>
          <h1 className="mt-5 text-5xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-7xl">
            A quiet archive for becoming.
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-400">
            学习、开发、投资和随想都放在这里。像 Notion 一样清晰，像 Linear 一样克制，
            像 Apple 页面一样保留呼吸感。
          </p>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-4">
          {journeyCategories.map((category) => {
            const categoryPosts = posts.filter((post) => post.category === category.slug);

            return (
              <a
                key={category.slug}
                href={`#${category.slug}`}
                className="group rounded-3xl border border-slate-200 bg-white/75 p-5 shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-blue-400/50"
              >
                <div className="text-2xl">{category.title.split(" ")[0]}</div>
                <h2 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">
                  {category.label}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {category.description}
                </p>
                <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                  {categoryPosts.length} posts
                </p>
              </a>
            );
          })}
        </section>

        {latestPost ? (
          <section className="mt-10 rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-xl shadow-slate-200/50 backdrop-blur dark:border-white/10 dark:bg-white/[0.05] dark:shadow-black/20 md:p-8">
            <div className="grid gap-8 md:grid-cols-[0.95fr_1.4fr] md:items-center">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.25em] text-purple-500 dark:text-purple-300">
                  Latest note
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  {latestPost.title}
                </h2>
                <p className="mt-4 text-slate-600 dark:text-slate-400">
                  {latestPost.excerpt}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/50">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {latestPost.date} · {latestPost.readingTime}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {latestPost.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/journey/${latestPost.category}/${latestPost.slug}`}
                  className="btn-primary mt-6 inline-flex rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Read the note
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-14 space-y-12">
          {journeyCategories.map((category) => {
            const categoryPosts = posts.filter((post) => post.category === category.slug);

            return (
              <div key={category.slug} id={category.slug} className="scroll-mt-28">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                      {category.title}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {category.description}
                    </p>
                  </div>
                  <span className="hidden text-sm text-slate-400 sm:inline">
                    {categoryPosts.length} entries
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {categoryPosts.map((post) => (
                    <Link
                      key={`${post.category}-${post.slug}`}
                      href={`/journey/${post.category}/${post.slug}`}
                      className="group rounded-3xl border border-slate-200 bg-white/75 p-6 shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-purple-400/50"
                    >
                      <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.18em] text-slate-400">
                        <span>{post.date}</span>
                        <span>{post.readingTime}</span>
                      </div>
                      <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950 transition-colors group-hover:text-purple-600 dark:text-white dark:group-hover:text-purple-300">
                        {post.title}
                      </h3>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {post.excerpt}
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </>
  );
}
