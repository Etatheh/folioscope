import { expect, it } from "vitest";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import { getJourneyPosts } from "../lib/journey";
import {
  buildFaqPageJsonLd, buildSoftwareApplicationJsonLd, englishFaqs,
  homeMetadata, pricingMetadata, siteMetadata,
} from "../lib/seo";

const origin = "https://folioscope.live";

it("lists every editorial article and indexable public page exactly once", () => {
  const posts = getJourneyPosts();
  const routes = ["/", "/pricing", "/terms", "/refund", "/privacy", "/disclaimer", "/journey",
    ...posts.map(p => `/journey/${p.category}/${p.slug}`)];
  const entries = sitemap();
  expect(entries.map(p => p.url).sort()).toEqual(routes.map(path => origin + path).sort());
  for (const { lastModified, changeFrequency, priority } of entries) {
    expect(new Date(lastModified).toISOString().slice(0, 10)).toBe(lastModified);
    expect(["weekly", "monthly", "yearly"]).toContain(changeFrequency);
    expect(priority).toBeGreaterThan(0);
    expect(priority).toBeLessThanOrEqual(1);
  }
});

it("advertises the canonical sitemap and covers private route roots and descendants", () => {
  const policy = robots();
  expect(policy.sitemap).toBe(origin + "/sitemap.xml");
  expect(policy.rules.userAgent).toBe("*");
  expect(policy.rules.allow).toBe("/");
  for (const path of ["/api/markets", "/dashboard", "/dashboard/markets/SPY", "/auth/callback", "/account", "/login", "/register"]) {
    expect(policy.rules.disallow.some(prefix => path.startsWith(prefix))).toBe(true);
  }
  for (const page of sitemap()) {
    expect(policy.rules.disallow.some(prefix => new URL(page.url).pathname.startsWith(prefix))).toBe(false);
  }
});

it("keeps canonical URLs page-specific and consistent across social metadata", () => {
  expect(siteMetadata.metadataBase.origin).toBe(origin);
  expect(siteMetadata.alternates?.canonical).toBeUndefined();
  for (const [metadata, path] of [[homeMetadata, "/"], [pricingMetadata, "/pricing"]]) {
    expect(metadata.alternates.canonical).toBe(origin + path);
    expect(metadata.openGraph.url).toBe(metadata.alternates.canonical);
    expect(metadata.twitter.description).toBe(metadata.description);
  }
});

it("describes the free and monthly USD offers with an explicit billing unit", () => {
  const app = buildSoftwareApplicationJsonLd();
  expect(app).toMatchObject({ "@context": "https://schema.org", "@type": "SoftwareApplication", applicationCategory: "FinanceApplication", url: origin });
  expect(app.offers.map(o => [o.name, Number(o.price), o.priceCurrency, o.url])).toEqual([
    ["Free", 0, "USD", origin + "/pricing"], ["Pro", 9.9, "USD", origin + "/pricing"],
  ]);
  expect(app.offers[1].priceSpecification.referenceQuantity).toMatchObject({ value: 1, unitCode: "MON" });
});

it("builds six FAQ entities from the reusable English copy", () => {
  const faq = buildFaqPageJsonLd();
  expect(faq["@type"]).toBe("FAQPage");
  expect(faq.mainEntity).toHaveLength(6);
  expect(faq.mainEntity).toEqual(englishFaqs.map(({ question, answer }) => ({
    "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer },
  })));
});
