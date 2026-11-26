# Static MDX blog

Add a trusted `.mdx` file to `content/blog/` using a lowercase, hyphenated filename.
The filename becomes the URL slug. For example,
`portfolio-visualizer-alternatives.mdx` appears at
`/blog/portfolio-visualizer-alternatives`.

```yaml
---
title: "Your article title"
description: "A short summary for the index and search results."
date: "2026-11-20"
ctaTicker: "QQQ"
tags:
  - Portfolio research
---
```

`title`, `description`, and a valid `YYYY-MM-DD` date are required. Quote dates
as shown above. `ctaTicker` defaults to `QQQ`; `tags` defaults to an empty list.
Invalid frontmatter fails the build with the filename and field name.

Write Markdown or MDX after the frontmatter. The page supplies the article title,
summary, date, tags, navigation, and dashboard CTA, so start body sections with `##`.
MDX is compiled as code: only publish content maintained in this repository.

Run `npm run build` and redeploy after adding or editing posts. The index,
article pages, and sitemap are generated at build time with no blog database or
runtime content service. Unknown slugs return 404. The blog uses the shared site
navigation and footer; static pages start with the site's default English language.

Use `<BlogBacktestEmbed preset="qqq-dca" />` to add an interactive chart. Preset
IDs and allocations are defined in `lib/blog-backtests.ts`. Article text is
prerendered and the chart fetches its preset results as it nears the viewport.
The public API accepts preset IDs only, with curated tickers and at most five
completed years of monthly history. The dashboard link opens the Simulator
view. The article and chart supply the settings to enter there.
