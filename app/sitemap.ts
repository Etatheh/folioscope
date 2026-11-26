import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.6 },
    ...getAllPosts().map(({ slug, meta }) => ({
      url: `${SITE_URL}/blog/${slug}`,
      lastModified: `${meta.date}T00:00:00Z`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
