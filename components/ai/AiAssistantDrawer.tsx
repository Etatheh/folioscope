"use client";
import { localizedError } from "@/lib/localized-text";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { dict, type Lang } from "@/lib/i18n";
import type {
  ChatDcaContext,
  ChatMarketContext,
  ChatMessage,
  ChatSimulatorContext,
} from "@/lib/chat";
import { useAiDca, useAiSimulator } from "@/lib/ai-context-store";
import { useSession } from "@/lib/use-session";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { getSupabaseClient } from "@/lib/supabase/client";
import MarkdownText from "./MarkdownText";

type UiMessage = ChatMessage & { id: string };

type RequestMode = "chat" | "diagnosis";

/** One-tap prompts pinned above the composer; new UI copy is English-only. */
const QUICK_ACTIONS: { label: string; prompt: string }[] = [
  {
    label: "📉 Cut Risk",
    prompt:
      "How can I cut risk in my current setup without abandoning the plan? Use the live page numbers.",
  },
  {
    label: "⚖️ Optimize Split",
    prompt:
      "How should I optimize my allocation split based on the current setup? Use the live page numbers.",
  },
  {
    label: "📊 Compare Benchmarks",
    prompt:
      "Compare my current setup with its benchmarks and explain the gap using the live page numbers.",
  },
];


function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function Sparkles({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AiAssistantDrawer({
  lang,
  marketContext,
}: {
  lang: Lang;
  marketContext: ChatMarketContext;
}) {
  const t = dict[lang].assistant;
  const { user, ready } = useSession();
  const { openAuthModal } = useAuthModal();
  const storedDca = useAiDca();
  const storedSimulator = useAiSimulator();
  const reduceMotion = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ remaining: number; limit: number } | null>(
    null
  );
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Streaming plumbing: batch tokens to one paint per frame (≈60fps) instead
  // of re-rendering Markdown for every upstream chunk.
  const streamingRef = useRef(false);
  const pinnedRef = useRef(true);
  const lastScrollTopRef = useRef(0);
  const diagnosisStartedRef = useRef(false);
  const runIdRef = useRef(0);
  const answerRef = useRef("");

  const markStreaming = useCallback((value: boolean) => {
    streamingRef.current = value;
    setStreaming(value);
  }, []);

  const context = useMemo<ChatMarketContext>(() => {
    const simulator: ChatSimulatorContext | null =
      marketContext.page === "dashboard"
        ? storedSimulator ?? marketContext.simulator ?? null
        : marketContext.simulator ?? null;
    // Prefer the live simulator snapshot over the legacy default DCA plan so
    // the diagnosis never mixes two unrelated backtests.
    const dca: ChatDcaContext | null = simulator
      ? null
      : marketContext.page === "dashboard"
        ? storedDca ?? marketContext.dca ?? null
        : marketContext.dca ?? null;
    return { ...marketContext, dca, simulator };
  }, [marketContext, storedDca, storedSimulator]);

  useEffect(() => {
    const element = listRef.current;
    if (!element || !pinnedRef.current) return;
    element.scrollTo({
      top: element.scrollHeight,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [messages, streaming, open, reduceMotion]);

  useEffect(() => {
    if (!open) return;
    pinnedRef.current = true;
    const element = listRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
      lastScrollTopRef.current = element.scrollTop;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 180);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Let the auth/upgrade dialog own Escape while it is on top.
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    markStreaming(false);
  }, [markStreaming]);

  const runRequest = useCallback(
    async (mode: RequestMode, raw = "") => {
      const content = raw.trim();
      if (mode === "chat" && !content) return;
      if (streamingRef.current) return;
      if (!ready) return;
      if (!user) {
        openAuthModal({ mode: "login", lang });
        if (mode === "diagnosis") setError(t.loginRequired);
        return;
      }

      const runId = runIdRef.current + 1;
      runIdRef.current = runId;

      setError(null);
      const history: ChatMessage[] = messages
        .filter((message) => message.content.trim())
        .map(({ role, content: text }) => ({ role, content: text }));
      if (mode === "chat") history.push({ role: "user", content });

      const assistantId = newId();
      const userMessage: UiMessage | null =
        mode === "chat" ? { id: newId(), role: "user", content } : null;
      setMessages((current) => [
        ...current,
        ...(userMessage ? [userMessage] : []),
        { id: assistantId, role: "assistant", content: "" },
      ]);
      if (mode === "chat") setInput("");
      pinnedRef.current = true;
      answerRef.current = "";
      markStreaming(true);

      // Coalesce tokens into a single React update per animation frame so the
      // Markdown tree stays smooth (≈60fps) instead of thrashing per chunk.
      let frame: number | null = null;
      const commit = () => {
        frame = null;
        if (runIdRef.current !== runId) return;
        const text = answerRef.current;
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId ? { ...message, content: text } : message
          )
        );
      };

      const queue = (delta: string) => {
        if (runIdRef.current !== runId) return;
        answerRef.current += delta;
        if (frame === null) {
          frame = requestAnimationFrame(commit);
        }
      };

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const supabase = await getSupabaseClient();
        let token: string | undefined;
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          token = data.session?.access_token;
        }

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            messages: history,
            mode,
            marketContext: { ...context, asOf: Date.now() },
            lang,
          }),
          signal: controller.signal,
        });

        const remaining = response.headers.get("x-quota-remaining");
        const limit = response.headers.get("x-quota-limit");
        if (remaining !== null && limit !== null) {
          setQuota({ remaining: Number(remaining), limit: Number(limit) });
        }

        if (response.status === 401) {
          openAuthModal({ mode: "login", lang });
          setError(t.loginRequired);
          setMessages((current) => current.filter((m) => m.id !== assistantId));
          return;
        }

        if (!response.ok || !response.body) {
          const data = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          setError(localizedError(data.error, lang, t.error));
          setMessages((current) => current.filter((m) => m.id !== assistantId));
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const consume = (event: string) => {
          for (const line of event.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const data = JSON.parse(payload) as {
                delta?: string;
                error?: string;
              };
              if (typeof data.delta === "string" && data.delta) {
                queue(data.delta);
              }
              if (typeof data.error === "string" && data.error) {
                setError(localizedError(data.error, lang, t.error));
              }
            } catch {
              // ignore malformed keep-alive fragments
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const event of events) consume(event);
        }
        buffer += decoder.decode();
        if (buffer.trim()) consume(buffer);

        if (!answerRef.current.trim()) setError(t.error);
      } catch {
        if (!controller.signal.aborted && runIdRef.current === runId) {
          setError(t.error);
        }
      } finally {
        if (frame !== null) cancelAnimationFrame(frame);
        // A newer request (refresh) has taken over; never let this run clobber it.
        if (runIdRef.current === runId) {
          const finalText = answerRef.current;
          if (finalText) {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: finalText }
                  : message
              )
            );
          }
          markStreaming(false);
          abortRef.current = null;
        }
      }
    },
    [
      context,
      lang,
      markStreaming,
      messages,
      openAuthModal,
      ready,
      t,
      user,
    ]
  );

  const send = useCallback(
    (raw: string) => {
      void runRequest("chat", raw);
    },
    [runRequest]
  );

  const refresh = useCallback(() => {
    abortRef.current?.abort();
    markStreaming(false);
    answerRef.current = "";
    setMessages([]);
    setError(null);
    setInput("");
    // Signed-out users should get the automatic diagnosis right after login.
    diagnosisStartedRef.current = Boolean(user);
    void runRequest("diagnosis");
  }, [markStreaming, runRequest, user]);

  // Proactive diagnosis: the first time the drawer opens for a signed-in user
  // (or right after the auth modal resolves), stream a read of the live page.
  useEffect(() => {
    if (!open || !ready || !user) return;
    if (messages.length > 0 || diagnosisStartedRef.current) return;
    diagnosisStartedRef.current = true;
    pinnedRef.current = true;
    void runRequest("diagnosis");
  }, [messages.length, open, ready, runRequest, user]);

  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "assistant") return messages[i].id;
    }
    return null;
  }, [messages]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t.open}
        aria-expanded={open}
        className="fixed bottom-5 right-4 z-30 flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-purple-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-purple-500/30 transition hover:-translate-y-0.5 hover:shadow-purple-500/50 sm:bottom-6 sm:right-6"
      >
        <Sparkles className="h-5 w-5" />
        <span>{t.open}</span>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={t.title}
            initial={reduceMotion ? false : { opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.22, 0.61, 0.36, 1] }}
            className="glass-panel fixed bottom-20 right-3 z-[80] flex h-[min(620px,calc(100dvh-7rem))] w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl sm:bottom-24 sm:right-6 sm:h-[min(640px,calc(100dvh-8rem))] sm:w-[420px]"
            style={{
              background:
                "linear-gradient(180deg, rgba(12,17,30,0.96) 0%, rgba(6,9,16,0.98) 100%)",
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-purple-500/20 blur-[64px]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -left-16 bottom-10 h-40 w-40 rounded-full bg-blue-500/15 blur-[60px]"
            />

            <header className="relative flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-amber-400 text-white shadow-lg shadow-purple-500/25">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <p className="text-sm font-semibold tracking-tight text-white">
                      {t.title}
                    </p>
                    <span className="text-slate-600">·</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-emerald-300">
                      <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
                      {t.live}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-slate-500">
                    {quota ? t.quota(quota.remaining, quota.limit) : t.synced}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={refresh}
                  aria-label="Refresh analysis"
                  title="Refresh analysis"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                  >
                    <path
                      d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t.close}
                  title={t.close}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-lg leading-none text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  ×
                </button>
              </div>
            </header>

            <div
              ref={listRef}
              className="relative flex-1 space-y-3 overflow-y-auto px-4 py-4"
              aria-live={streaming ? "off" : "polite"}
              onScroll={() => {
                const element = listRef.current;
                if (!element) return;
                const top = element.scrollTop;
                const delta = top - lastScrollTopRef.current;
                lastScrollTopRef.current = top;
                // A negative delta means the reader deliberately scrolled up;
                // stop chasing the stream until they return to the bottom.
                if (delta < -2) {
                  pinnedRef.current = false;
                  return;
                }
                if (
                  element.scrollHeight - top - element.clientHeight <
                  96
                ) {
                  pinnedRef.current = true;
                }
              }}
            >
              {messages.length === 0 && (
                <div className="space-y-3">
                  <div className="rounded-2xl rounded-tl-md border border-white/[0.07] bg-white/[0.04] px-3.5 py-3">
                    {ready && !user ? (
                      <div className="space-y-2.5">
                        <p className="text-[13px] leading-relaxed text-slate-300">
                          {t.loginRequired}
                        </p>
                        <button
                          type="button"
                          onClick={() => openAuthModal({ mode: "login", lang })}
                          className="rounded-full border border-purple-400/30 bg-gradient-to-r from-blue-500/15 to-purple-500/15 px-3 py-1.5 text-[11px] font-medium text-purple-100 transition hover:border-purple-400/60 hover:text-white"
                        >
                          {lang === "zh" ? "登录后立即查看" : "Sign in for an instant read"}
                        </button>
                      </div>
                    ) : !streaming && error ? (
                      <div className="space-y-2.5">
                        <p className="text-[13px] leading-relaxed text-slate-400">
                          {lang === "zh" ? "实时分析未能完成。" : "The live read did not finish."}
                        </p>
                        <button
                          type="button"
                          onClick={refresh}
                          className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-slate-200 transition hover:border-purple-400/50 hover:text-white"
                        >
                          {lang === "zh" ? "重试" : "Try again"}
                        </button>
                      </div>
                    ) : (
                      <p className="flex items-center gap-2 text-[13px] leading-relaxed text-slate-300">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400 shadow-[0_0_10px_#a855f7]" />
                        {t.thinking}
                      </p>
                    )}
                  </div>

                  {(context.indices.length > 0 ||
                    context.focused ||
                    context.dca) && (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                      <p className="text-[10px] font-medium tracking-wide text-slate-500">
                        {t.contextLabel}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {context.indices.slice(0, 4).map((index) => (
                          <span
                            key={index.symbol}
                            className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-400"
                          >
                            {index.name}{" "}
                            <span
                              className={
                                index.changePct >= 0
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }
                            >
                              {index.changePct >= 0 ? "+" : ""}
                              {index.changePct.toFixed(2)}%
                            </span>
                          </span>
                        ))}
                        {context.focused && (
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-400">
                            {context.focused.symbol}{" "}
                            <span
                              className={
                                context.focused.changePct >= 0
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }
                            >
                              {context.focused.changePct >= 0 ? "+" : ""}
                              {context.focused.changePct.toFixed(2)}%
                            </span>
                          </span>
                        )}
                        {context.dca && (
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-400">
                            {context.dca.targetName} · {context.dca.period} · $
                            {Math.round(context.dca.monthly).toLocaleString("en-US")}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {messages.map((message) => {
                const isUser = message.role === "user";
                const isStreamingHere =
                  streaming &&
                  message.id === lastAssistantId &&
                  message.role === "assistant";
                return (
                  <div
                    key={message.id}
                    className={`flex items-start gap-2 ${
                      isUser ? "justify-end" : "ai-stream-in justify-start"
                    }`}
                  >
                    {!isUser && (
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-500/80 to-purple-600/80 text-white">
                        <Sparkles className="h-3 w-3" />
                      </span>
                    )}
                    <div
                      className={`max-w-[86%] break-words rounded-2xl px-3.5 py-2.5 ${
                        isUser
                          ? "rounded-tr-md bg-gradient-to-r from-blue-500/25 to-purple-500/30 text-[13px] leading-relaxed text-white"
                          : `rounded-tl-md border border-white/[0.07] bg-white/[0.04] text-slate-300 ${
                              isStreamingHere ? "ai-stream-glow" : ""
                            }`
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      ) : message.content ? (
                        <MarkdownText
                          content={message.content}
                          trailing={
                            isStreamingHere ? (
                              <span
                                aria-hidden
                                className="ml-0.5 inline-block h-3.5 w-[3px] animate-pulse rounded-full bg-purple-400 align-[-2px] shadow-[0_0_12px_#a855f7]"
                              />
                            ) : null
                          }
                        />
                      ) : isStreamingHere ? (
                        <p className="flex items-center gap-1.5 text-[12px] text-slate-500">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400 shadow-[0_0_10px_#a855f7]" />
                          {t.thinking}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <p
                role="alert"
                className="relative mx-4 mb-2 rounded-lg bg-rose-500/10 px-3 py-2 text-[11px] leading-relaxed text-rose-300"
              >
                {error}
              </p>
            )}

            <form
              className="relative border-t border-white/10 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void send(input);
              }}
            >
              <div className="mb-2 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    disabled={streaming}
                    onClick={() => send(action.prompt)}
                    className="shrink-0 whitespace-nowrap rounded-full border border-purple-400/25 bg-gradient-to-r from-blue-500/10 to-purple-500/10 px-3 py-1.5 text-[11px] text-slate-300 transition hover:border-purple-400/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={t.placeholder}
                  rows={2}
                  className="min-h-[44px] flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-purple-400/50 focus:bg-white/[0.06]"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void send(input);
                    }
                  }}
                />
                {streaming ? (
                  <button
                    type="button"
                    onClick={stop}
                    className="whitespace-nowrap rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20"
                  >
                    {t.stop}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="btn-primary whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t.send}
                  </button>
                )}
              </div>
            </form>

            <p className="relative px-4 pb-3 text-center text-[9.5px] leading-relaxed text-slate-600">
              {t.disclaimer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}