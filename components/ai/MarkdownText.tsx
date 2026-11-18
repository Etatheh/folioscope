import { createElement, type ReactNode } from "react";

/**
 * Small, dependency-free Markdown renderer for streamed assistant answers.
 * Supports headings, bullet/ordered lists, blockquotes, rules, bold, italic,
 * inline code and safe links — enough for FolioScope AI's structured replies.
 */

function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (/^https?:\/\//i.test(href) || href.startsWith("/") || href.startsWith("#")) {
    return href;
  }
  return null;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push(
        <strong key={`b-${key++}`} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={`c-${key++}`}
          className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.85em] text-purple-200"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[")) {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      const href = link ? safeHref(link[2]) : null;
      if (link && href) {
        nodes.push(
          <a
            key={`a-${key++}`}
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noreferrer noopener" : undefined}
            className="text-purple-300 underline decoration-purple-400/40 underline-offset-2 transition hover:text-purple-200"
          >
            {link[1]}
          </a>
        );
      } else {
        nodes.push(token);
      }
    } else {
      nodes.push(
        <em key={`i-${key++}`} className="text-slate-200">
          {token.slice(1, -1)}
        </em>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export default function MarkdownText({ content }: { content: string }) {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      createElement(
        Tag,
        {
          key: `l-${key++}`,
          className: `my-1.5 space-y-1 pl-4 text-[12.5px] leading-relaxed text-slate-300 ${
            list.ordered ? "list-decimal" : "list-disc"
          } marker:text-purple-400/70`,
        },
        list.items.map((item, index) => (
          <li key={`${index}-${item.slice(0, 20)}`}>{renderInline(item)}</li>
        ))
      )
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const Tag = (["h2", "h3", "h4", "h5"] as const)[level - 1] ?? "h4";
      blocks.push(
        createElement(
          Tag,
          {
            key: `h-${key++}`,
            className:
              level <= 2
                ? "mt-2 text-[13.5px] font-semibold text-white"
                : "mt-1.5 text-[12.5px] font-semibold text-slate-200",
          },
          renderInline(heading[2])
        )
      );
      continue;
    }

    const bullet = /^[-*•]\s+(.+)$/.exec(line);
    if (bullet) {
      if (list && list.ordered) flushList();
      if (!list) list = { ordered: false, items: [] };
      list.items.push(bullet[1]);
      continue;
    }

    const ordered = /^\d+[.)]\s+(.+)$/.exec(line);
    if (ordered) {
      if (list && !list.ordered) flushList();
      if (!list) list = { ordered: true, items: [] };
      list.items.push(ordered[1]);
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flushList();
      blocks.push(
        <blockquote
          key={`q-${key++}`}
          className="my-1.5 border-l-2 border-amber-300/40 py-0.5 pl-2.5 text-[11.5px] leading-relaxed text-amber-100/75"
        >
          {renderInline(quote[1])}
        </blockquote>
      );
      continue;
    }

    if (/^---+$/.test(line)) {
      flushList();
      blocks.push(<hr key={`r-${key++}`} className="my-2 border-white/10" />);
      continue;
    }

    flushList();
    blocks.push(
      <p key={`p-${key++}`} className="text-[13px] leading-relaxed text-slate-300">
        {renderInline(line)}
      </p>
    );
  }

  flushList();

  if (blocks.length === 0) return null;
  return <div className="space-y-1.5">{blocks}</div>;
}