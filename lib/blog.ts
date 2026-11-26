import "server-only";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const postsDirectory = path.join(process.cwd(), "content", "blog");
const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type BlogMeta = {
  title: string;
  description: string;
  date: string;
  ctaTicker: string;
  tags: string[];
};

export type BlogPost = { slug: string; meta: BlogMeta; content: string };

function parseMeta(data: Record<string, unknown>, slug: string): BlogMeta {
  const fail = (field: string): never => {
    throw new Error(`Invalid ${field} in content/blog/${slug}.mdx`);
  };
  const requiredString = (field: string): string => {
    const value = data[field];
    return typeof value === "string" && value.trim() ? value.trim() : fail(field);
  };
  const title = requiredString("title");
  const description = requiredString("description");
  // YAML parses unquoted dates as Date objects; normalize both forms to UTC.
  const date = data.date instanceof Date
    ? data.date.toISOString().slice(0, 10)
    : requiredString("date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date) fail("date (YYYY-MM-DD)");
  const ctaTicker = data.ctaTicker === undefined ? "QQQ" : requiredString("ctaTicker");
  const tags = data.tags === undefined ? [] : data.tags;
  if (!Array.isArray(tags) || !tags.every((tag): tag is string => typeof tag === "string" && !!tag.trim())) {
    fail("tags (string[])");
  }
  return { title, description, date, ctaTicker, tags: (tags as string[]).map(tag => tag.trim()) };
}

export function getPostBySlug(slug: string): BlogPost | null {
  // Only a single filename is accepted; never resolve user-controlled paths.
  if (!validSlug.test(slug)) return null;
  const filename = path.join(postsDirectory, `${slug}.mdx`);
  let source: string;
  try {
    source = fs.readFileSync(filename, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const { data, content } = matter(source);
  return { slug, meta: parseMeta(data, slug), content };
}

export function getAllPosts(): Omit<BlogPost, "content">[] {
  if (!fs.existsSync(postsDirectory)) return [];
  return fs.readdirSync(postsDirectory, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith(".mdx"))
    .map(entry => {
      const slug = entry.name.slice(0, -4);
      if (!validSlug.test(slug)) throw new Error(`Invalid blog filename: ${entry.name}`);
      const post = getPostBySlug(slug);
      if (!post) throw new Error(`Missing blog post: ${slug}`);
      return { slug: post.slug, meta: post.meta };
    })
    .sort((a, b) => b.meta.date.localeCompare(a.meta.date) || a.slug.localeCompare(b.slug));
}

export function formatPostDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
