import type { MetadataRoute } from "next";
import { getJourneyPosts } from "@/lib/journey";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getJourneyPosts().map(post => ({
    url: `${SITE_URL}/journey/${post.category}/${post.slug}`,
    // The articles currently carry a single editorial date in frontmatter.
    lastModified: post.date || undefined,
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  // Dates of the last substantive page revisions. Update with public copy changes.
  const listingModified = articles.reduce((latest, article) =>
    article.lastModified && article.lastModified > latest ? article.lastModified : latest,
  "2026-11-20");

  return [
    { url: `${SITE_URL}/`, lastModified: "2026-11-20", changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/pricing`, lastModified: "2026-11-20", changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/journey`, lastModified: listingModified, changeFrequency: "weekly", priority: 0.7 },
    ...articles,
    ...[
      ["/terms", "2026-11-21"],
      ["/privacy", "2026-11-20"],
      ["/refund", "2026-11-20"],
      ["/disclaimer", "2026-11-20"],
    ].map(([path, lastModified]) => ({
      url: SITE_URL + path, lastModified, changeFrequency: "yearly" as const, priority: 0.3,
    })),
  ];
}
