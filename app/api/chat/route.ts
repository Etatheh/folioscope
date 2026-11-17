import fs from "node:fs";
import path from "node:path";

import {
  COMPLIANCE_NOTE,
  buildSystemPrompt,
  formatMarketContext,
  hasComplianceNote,
  normalizeMarketContext,
  normalizeMessages,
  type ChatMessage,
  type ChatMarketContext,
} from "@/lib/chat";
import { resolveRequestUser } from "@/lib/server/request-user";
import {
  DAILY_LIMITS,
  getUsage,
  incrementUsage,
  type Usage,
} from "@/lib/server/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Lang = "zh" | "en";

const MSG = {
  zh: {
    unauthorized: "请先登录再使用 indepth AI。",
    empty: "请输入问题。",
    badRequest: "请求格式错误。",
    quota: (limit: number) =>
      `今日提问额度已用完（${limit} 次）。升级 Pro 可获得更高额度。`,
    notConfigured:
      "AI 服务尚未配置。请在环境变量中设置 AI_API_KEY、AI_BASE_URL 和 AI_MODEL_NAME。",
    upstream: "AI 服务暂时不可用，请稍后再试。",
    emptyReply: "AI 没有返回内容，请换个问法再试。",
  },
  en: {
    unauthorized: "Please log in to use indepth AI.",
    empty: "Please ask a question.",
    badRequest: "Invalid request.",
    quota: (limit: number) =>
      `Daily limit reached (${limit} questions). Upgrade to Pro for a higher limit.`,
    notConfigured:
      "The AI service is not configured. Set AI_API_KEY, AI_BASE_URL and AI_MODEL_NAME.",
    upstream: "The AI service is temporarily unavailable. Please try again.",
    emptyReply: "The AI returned an empty answer. Please rephrase your question.",
  },
} as const;

type AiConfig = { key: string; baseUrl: string; model: string };

function readAgentKeyFile(): string | null {
  try {
    const key = fs
      .readFileSync(path.join(process.cwd(), ".agent-key"), "utf8")
      .trim();
    return key || null;
  } catch {
    return null;
  }
}

/**
 * OpenAI-compatible provider config.
 *
 * Primary env names: AI_API_KEY / AI_BASE_URL / AI_MODEL_NAME.
 * Legacy names remain as fallbacks so existing DeepSeek setups keep working.
 */
function readAiConfig(): AiConfig | null {
  const key =
    process.env.AI_API_KEY?.trim() ||
    process.env.DASHSCOPE_API_KEY?.trim() ||
    process.env.DEEPSEEK_API_KEY?.trim() ||
    process.env.AGENT_API_KEY?.trim() ||
    readAgentKeyFile();

  if (!key) return null;

  const baseUrl = (
    process.env.AI_BASE_URL?.trim() ||
    process.env.AGENT_BASE_URL?.trim() ||
    "https://api.deepseek.com"
  ).replace(/\/+$/, "");

  const model =
    process.env.AI_MODEL_NAME?.trim() ||
    process.env.AGENT_MODEL?.trim() ||
    "deepseek-chat";

  return { key, baseUrl, model };
}

function completionsUrl(baseUrl: string): string {
  return /\/chat\/completions$/.test(baseUrl)
    ? baseUrl
    : `${baseUrl}/chat/completions`;
}

function jsonError(message: string, status: number, code?: string) {
  return Response.json(
    { ok: false, error: message, code },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

const encoder = new TextEncoder();
const sse = (payload: unknown) =>
  encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);

const SSE_HEADERS: Record<string, string> = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

function usageHeaders(usage: Usage | null): Record<string, string> {
  if (!usage) return {};
  return {
    "X-Quota-Limit": String(usage.limit),
    "X-Quota-Remaining": String(Math.max(0, usage.remaining - 1)),
  };
}

function parseDelta(data: string): string | null {
  try {
    const json = JSON.parse(data) as {
      choices?: {
        delta?: { content?: string };
        text?: string;
        message?: { content?: string };
      }[];
      error?: { message?: string } | string;
    };
    if (json.error) return null;
    const choice = json.choices?.[0];
    const content =
      choice?.delta?.content ?? choice?.text ?? choice?.message?.content ?? null;
    return typeof content === "string" && content ? content : null;
  } catch {
    return null;
  }
}

/** Stream a non-SSE JSON completion as a single SSE delta. */
function streamJsonReply(text: string, lang: Lang, usage: Usage | null) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let answer = text;
      if (!hasComplianceNote(answer, lang)) {
        answer += `\n\n> ${COMPLIANCE_NOTE[lang]}`;
      }
      controller.enqueue(sse({ delta: answer }));
      controller.enqueue(sse({ done: true }));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { ...SSE_HEADERS, ...usageHeaders(usage) },
  });
}

export async function GET(request: Request) {
  const session = await resolveRequestUser(request);
  const user = session?.user ?? null;
  if (!user) {
    return jsonError(MSG.en.unauthorized, 401, "UNAUTHORIZED");
  }

  const headers = { "Cache-Control": "no-store" };
  if (user.isAdmin) {
    return Response.json(
      {
        ok: true,
        unlimited: true,
        tier: "admin",
        used: 0,
        limit: 0,
        remaining: 0,
      },
      { headers }
    );
  }

  const limit = DAILY_LIMITS[user.plan];
  try {
    const usage = await getUsage(user.id, user.plan);
    return Response.json(
      { ok: true, unlimited: false, tier: user.plan, ...usage },
      { headers }
    );
  } catch {
    return Response.json(
      {
        ok: true,
        unlimited: false,
        tier: user.plan,
        used: 0,
        limit,
        remaining: limit,
      },
      { headers }
    );
  }
}

export async function POST(request: Request) {
  let body: {
    messages?: unknown;
    marketContext?: unknown;
    lang?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError(MSG.en.badRequest, 400, "BAD_JSON");
  }

  const rawLang = body.lang === "zh" ? "zh" : "en";
  const marketContext: ChatMarketContext = normalizeMarketContext(body.marketContext);
  marketContext.asOf = marketContext.asOf ?? Date.now();
  const lang: Lang = marketContext.lang ?? rawLang;
  const t = MSG[lang];

  const session = await resolveRequestUser(request);
  const user = session?.user ?? null;
  if (!user) {
    return jsonError(t.unauthorized, 401, "UNAUTHORIZED");
  }

  const messages: ChatMessage[] = normalizeMessages(body.messages);
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return jsonError(t.empty, 400, "EMPTY");
  }

  // Developers skip metering; the quota is enforced best-effort so a missing
  // usage table never blocks the assistant entirely.
  let usage: Usage | null = null;
  if (!user.isAdmin) {
    try {
      usage = await getUsage(user.id, user.plan);
      if (usage.remaining <= 0) {
        return jsonError(t.quota(usage.limit), 429, "QUOTA_EXCEEDED");
      }
    } catch {
      usage = null;
    }
  }

  const config = readAiConfig();
  if (!config) {
    return jsonError(t.notConfigured, 503, "AI_NOT_CONFIGURED");
  }

  const system = `${buildSystemPrompt(lang)}\n\n=== Live page context ===\n${formatMarketContext(
    marketContext,
    lang
  )}`;

  const upstreamController = new AbortController();
  const timeout = setTimeout(() => upstreamController.abort(), 60_000);
  const onRequestAbort = () => upstreamController.abort();
  request.signal.addEventListener("abort", onRequestAbort);

  let upstream: Response;
  try {
    upstream = await fetch(completionsUrl(config.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.key}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.4,
        max_tokens: 1_000,
        stream: true,
        messages: [{ role: "system", content: system }, ...messages],
      }),
      cache: "no-store",
      signal: upstreamController.signal,
    });
  } catch {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", onRequestAbort);
    return jsonError(t.upstream, 502, "UPSTREAM_ERROR");
  }

  if (!upstream.ok) {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", onRequestAbort);
    console.error(
      `[api/chat] upstream ${upstream.status}: ${(await upstream.text()).slice(0, 500)}`
    );
    return jsonError(t.upstream, 502, "UPSTREAM_ERROR");
  }

  const contentType = upstream.headers.get("content-type") ?? "";

  // Some OpenAI-compatible gateways ignore stream:true. Handle a JSON reply.
  if (!contentType.includes("text/event-stream")) {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", onRequestAbort);
    try {
      const json = (await upstream.json()) as {
        choices?: { message?: { content?: string }; text?: string }[];
      };
      const text =
        json.choices?.[0]?.message?.content ?? json.choices?.[0]?.text ?? "";
      if (!text.trim()) return jsonError(t.emptyReply, 502, "EMPTY_REPLY");
      if (usage) {
        try {
          await incrementUsage(user.id);
        } catch {
          // usage is best-effort
        }
      }
      return streamJsonReply(text.trim(), lang, usage);
    } catch {
      return jsonError(t.upstream, 502, "UPSTREAM_ERROR");
    }
  }

  if (!upstream.body) {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", onRequestAbort);
    return jsonError(t.upstream, 502, "UPSTREAM_ERROR");
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";

      const emit = (payload: unknown) => {
        controller.enqueue(sse(payload));
      };

      const consumeLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) return;
        if (!trimmed.startsWith("data:")) return;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") return;
        const delta = parseDelta(data);
        if (delta) {
          answer += delta;
          emit({ delta });
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) consumeLine(line);
        }
        buffer += decoder.decode();
        if (buffer) {
          for (const line of buffer.split("\n")) consumeLine(line);
        }

        if (!answer.trim()) {
          emit({ error: t.emptyReply });
        } else if (!hasComplianceNote(answer, lang)) {
          emit({ delta: `\n\n> ${COMPLIANCE_NOTE[lang]}` });
        }

        emit({ done: true });

        if (usage) {
          try {
            await incrementUsage(user.id);
          } catch {
            // usage is best-effort; never break a completed answer
          }
        }
        controller.close();
      } catch {
        if (!request.signal.aborted) {
          try {
            emit({ error: t.upstream });
          } catch {
            // client already disconnected
          }
        }
        try {
          controller.close();
        } catch {
          // already closed
        }
      } finally {
        clearTimeout(timeout);
        request.signal.removeEventListener("abort", onRequestAbort);
        try {
          reader.releaseLock();
        } catch {
          // ignore
        }
      }
    },
    cancel() {
      upstreamController.abort();
    },
  });

  return new Response(stream, {
    headers: { ...SSE_HEADERS, ...usageHeaders(usage) },
  });
}