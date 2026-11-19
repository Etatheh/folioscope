"use client";

import { useEffect, useRef, useState } from "react";
import { dict, type Lang } from "@/lib/i18n";

type Msg = { role: "user" | "assistant"; content: string };
type Usage = { used: number; limit: number; remaining: number };

export default function AgentChat({ lang }: { lang: Lang }) {
  const t = dict[lang].agent;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"local" | "llm" | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;

    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, lang }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        reply?: string;
        error?: string;
        mode?: "local" | "llm";
        usage?: Usage;
      };
      if (data.usage) setUsage(data.usage);
      if (!res.ok || !data.ok) {
        setMessages([...next, { role: "assistant", content: data.error ?? t.error }]);
        return;
      }
      setMode(data.mode ?? null);
      setMessages([...next, { role: "assistant", content: data.reply ?? t.error }]);
    } catch {
      setMessages([...next, { role: "assistant", content: t.error }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.open}
        className="fixed bottom-6 right-5 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-purple-500/30 transition hover:-translate-y-0.5 sm:right-6"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {open ? "×" : t.open}
      </button>

      {open && (
        <div className="glass fixed bottom-24 right-4 z-50 flex h-[520px] w-[370px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl shadow-2xl">
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">{t.title}</p>
              <p className="text-[11px] text-slate-500">
                {mode === "llm" ? "FolioScope AI · " : ""}
                {usage ? t.quota(usage.remaining, usage.limit) : t.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="close"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              ×
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-slate-400">{t.welcome}</p>
                <div className="flex flex-wrap gap-2">
                  {t.quick.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
                      className="rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-xs text-slate-300 transition hover:text-white"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : ""}>
                <div
                  className={`inline-block max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-left text-[13px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-blue-500/25 to-purple-500/25 text-white"
                      : "bg-white/[0.05] text-slate-300"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <p className="text-xs text-slate-500">{t.thinking}</p>}
          </div>

          <form
            className="flex items-end gap-2 border-t border-white/10 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.placeholder}
              rows={2}
              className="flex-1 resize-none rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn-primary rounded-xl px-3 py-2 text-xs text-white disabled:opacity-40"
            >
              {t.send}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
