---
title: Building the Journey Page
date: 2026-06-28
tags: Next.js, Markdown, TailwindCSS
excerpt: A build note for the new Markdown-powered Journey page and the content structure behind it.
---

## Shape of the feature

This page keeps writing close to the codebase. Each note is a `.md` file inside `content`, grouped by category.

```txt
content/
  learning/
  coding/
  investment/
  thoughts/
```

## Design direction

The interface should feel calm: generous spacing, soft borders, readable typography, and cards that do not shout for attention.

## Implementation note

The route reads local Markdown files on the server, extracts frontmatter, and renders a responsive archive without needing a database.
