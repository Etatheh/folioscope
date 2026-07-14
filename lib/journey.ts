import fs from "node:fs";
import path from "node:path";

export const journeyCategories = [
  {
    slug: "learning",
    label: "Learning",
    title: "📚 Learning",
    description: "Notes from courses, books, papers, and deliberate practice.",
  },
  {
    slug: "coding",
    label: "Coding",
    title: "💻 Coding",
    description: "Build logs, engineering decisions, and tiny technical wins.",
  },
  {
    slug: "investment",
    label: "Investment",
    title: "📈 Investment",
    description: "Market observations, frameworks, and long-term conviction.",
  },
  {
    slug: "thoughts",
    label: "Thoughts",
    title: "💭 Thoughts",
    description: "Personal reflections, questions, and unfinished ideas.",
  },
] as const;

export type JourneyCategory = (typeof journeyCategories)[number]["slug"];

export type JourneyPost = {
  slug: string;
  category: JourneyCategory;
  title: string;
  date: string;
  tags: string[];
  excerpt: string;
  content: string;
  readingTime: string;
};

const contentDirectory = path.join(process.cwd(), "content");

function isJourneyCategory(value: string): value is JourneyCategory {
  return journeyCategories.some((category) => category.slug === value);
}

function getCategoryDirectory(category: JourneyCategory) {
  return path.join(contentDirectory, category);
}

function parseFrontmatter(fileContent: string) {
  const frontmatterMatch = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

  if (!frontmatterMatch) {
    return {
      metadata: {} as Record<string, string>,
      content: fileContent.trim(),
    };
  }

  const metadata = frontmatterMatch[1]
    .split(/\r?\n/)
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex === -1) {
        return acc;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      acc[key] = value.replace(/^["']|["']$/g, "");

      return acc;
    }, {});

  return {
    metadata,
    content: fileContent.slice(frontmatterMatch[0].length).trim(),
  };
}

function parseTags(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((tag) => tag.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function getReadingTime(content: string) {
  const words = content
    .replace(/[^\w\u4e00-\u9fff]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

export function getJourneyPost(category: string, slug: string) {
  if (!isJourneyCategory(category) || !/^[a-z0-9-]+$/.test(slug)) {
    return null;
  }

  const filePath = path.join(getCategoryDirectory(category), `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContent = fs.readFileSync(filePath, "utf8");
  const { metadata, content } = parseFrontmatter(fileContent);

  return {
    slug,
    category,
    title: metadata.title ?? slug.replaceAll("-", " "),
    date: metadata.date ?? "",
    tags: parseTags(metadata.tags),
    excerpt: metadata.excerpt ?? "",
    content,
    readingTime: getReadingTime(content),
  } satisfies JourneyPost;
}

export function getJourneyPosts() {
  return journeyCategories
    .flatMap((category) => {
      const categoryDirectory = getCategoryDirectory(category.slug);

      if (!fs.existsSync(categoryDirectory)) {
        return [];
      }

      return fs
        .readdirSync(categoryDirectory)
        .filter((fileName) => fileName.endsWith(".md"))
        .map((fileName) =>
          getJourneyPost(category.slug, fileName.replace(/\.md$/, "")),
        )
        .filter((post): post is JourneyPost => Boolean(post));
    })
    .sort((a, b) => Number(new Date(b.date)) - Number(new Date(a.date)));
}

export function getJourneyCategory(slug: string) {
  return journeyCategories.find((category) => category.slug === slug);
}
