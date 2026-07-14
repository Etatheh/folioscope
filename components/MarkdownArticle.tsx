import Link from "next/link";
import type { ReactNode } from "react";

type MarkdownArticleProps = {
  content: string;
};

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const patterns = [
      { type: "code", match: remaining.match(/`([^`]+)`/) },
      { type: "bold", match: remaining.match(/\*\*([^*]+)\*\*/) },
      { type: "link", match: remaining.match(/\[([^\]]+)\]\(([^)]+)\)/) },
    ].filter((item) => item.match?.index !== undefined);

    const next = patterns.sort(
      (a, b) => (a.match?.index ?? 0) - (b.match?.index ?? 0),
    )[0];

    if (!next?.match || next.match.index === undefined) {
      nodes.push(remaining);
      break;
    }

    if (next.match.index > 0) {
      nodes.push(remaining.slice(0, next.match.index));
    }

    if (next.type === "code") {
      nodes.push(
        <code
          key={`code-${key}`}
          className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-sm text-slate-800 dark:border-white/10 dark:bg-white/10 dark:text-slate-100"
        >
          {next.match[1]}
        </code>,
      );
    }

    if (next.type === "bold") {
      nodes.push(
        <strong key={`strong-${key}`} className="font-semibold text-slate-950 dark:text-white">
          {next.match[1]}
        </strong>,
      );
    }

    if (next.type === "link") {
      nodes.push(
        <Link
          key={`link-${key}`}
          href={next.match[2]}
          className="font-medium text-blue-600 underline decoration-blue-500/30 underline-offset-4 transition-colors hover:text-blue-500 dark:text-blue-300"
        >
          {next.match[1]}
        </Link>,
      );
    }

    remaining = remaining.slice(next.match.index + next.match[0].length);
    key += 1;
  }

  return nodes;
}

export default function MarkdownArticle({ content }: MarkdownArticleProps) {
  const blocks = content.split(/\r?\n\r?\n/);

  return (
    <div className="space-y-6 text-base leading-8 text-slate-700 dark:text-slate-300">
      {blocks.map((block, index) => {
        const trimmed = block.trim();

        if (!trimmed) {
          return null;
        }

        if (trimmed.startsWith("```")) {
          const code = trimmed.replace(/^```\w*\r?\n?/, "").replace(/```$/, "");

          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-5 text-sm leading-7 text-slate-100 shadow-sm dark:border-white/10"
            >
              <code>{code}</code>
            </pre>
          );
        }

        const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);

        if (heading) {
          const level = heading[1].length;
          const children = renderInline(heading[2]);

          if (level === 1) {
            return (
              <h1 key={index} className="pt-4 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
                {children}
              </h1>
            );
          }

          if (level === 2) {
            return (
              <h2 key={index} className="pt-6 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                {children}
              </h2>
            );
          }

          return (
            <h3 key={index} className="pt-4 text-xl font-semibold text-slate-950 dark:text-white">
              {children}
            </h3>
          );
        }

        if (trimmed.startsWith(">")) {
          return (
            <blockquote
              key={index}
              className="rounded-2xl border-l-4 border-blue-500 bg-blue-50 px-5 py-4 text-slate-700 dark:bg-blue-500/10 dark:text-slate-200"
            >
              {renderInline(trimmed.replace(/^>\s?/, ""))}
            </blockquote>
          );
        }

        const lines = trimmed.split(/\r?\n/);
        const isList = lines.every((line) => /^[-*]\s+/.test(line));

        if (isList) {
          return (
            <ul key={index} className="space-y-2 pl-5">
              {lines.map((line) => (
                <li key={line} className="list-disc pl-2">
                  {renderInline(line.replace(/^[-*]\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index}>
            {renderInline(trimmed.replace(/\r?\n/g, " "))}
          </p>
        );
      })}
    </div>
  );
}
