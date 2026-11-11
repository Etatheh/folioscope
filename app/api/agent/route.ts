import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";

import { getUsMarketSnapshot } from "@/lib/us-stocks";
import { getCnMarketSnapshot } from "@/lib/cn-markets";
import { getAsiaMarketSnapshot } from "@/lib/asia-markets";
import {
  buildMarketContext,
  localAnalyze,
  type MarketBundle,
} from "@/lib/agent-context";
import { getSessionUser } from "@/lib/server/auth-service";
import { COOKIE_NAME } from "@/lib/server/auth";
import { getUsage, incrementUsage } from "@/lib/server/quota";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };
type Lang = "zh" | "en";

const MSG = {
  en: {
    unauthorized: "Please log in to use the AI assistant.",
    quota: (limit: number) =>
      `Daily limit reached (${limit} questions). Upgrade to Pro for a higher limit.`,
    badRequest: "Invalid request.",
    empty: "Please ask a question.",
  },
  zh: {
    unauthorized: "请先登录再使用 AI 助手。",
    quota: (limit: number) =>
      `今日提问额度已用完（${limit} 次）。升级 Pro 可获得更高额度。`,
    badRequest: "请求格式错误。",
    empty: "请输入问题。",
  },
} as const;

function readApiKey(): string | null {
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY;
  if (process.env.AGENT_API_KEY) return process.env.AGENT_API_KEY;
  try {
    const key = fs
      .readFileSync(path.join(process.cwd(), ".agent-key"), "utf8")
      .trim();
    return key || null;
  } catch {
    return null;
  }
}

function buildSystemPrompt(lang: Lang): string {
  const common = [
    "You are the built-in market analyst embedded in a personal finance dashboard.",
    "Answer ONLY from the live market data provided below. If something is missing, say so.",
    "Be concise (max ~200 words), plain text (no tables, no markdown headers).",
    "You never give investment advice; if asked, give the data and a short disclaimer.",
    "Mention that the answer is for reference only when discussing a stock.",
  ];
  if (lang === "zh") {
    return [...common, "请用简体中文回答，可适当使用换行分段。"].join("\n");
  }
  return [...common, "Reply in English."].join("\n");
}

async function generateReply(
  bundle: MarketBundle,
  messages: ChatMessage[],
  lang: Lang
): Promise<{ mode: "local" | "llm"; reply: string }> {
  const key = readApiKey();
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  if (!key) {
    return { mode: "local", reply: localAnalyze(bundle, lastUser, lang) };
  }

  const baseUrl = process.env.AGENT_BASE_URL ?? "https://api.deepseek.com";
  const model = process.env.AGENT_MODEL ?? "deepseek-chat";
  const context = buildMarketContext(bundle, lang);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content: `${buildSystemPrompt(lang)}\n\n=== Live market data ===\n${context}`,
          },
          ...messages,
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`llm responded ${response.status}`);
    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = json.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("empty llm reply");
    return { mode: "llm", reply };
  } catch {
    // Degrade gracefully to the built-in analyst when the LLM call fails.
    return { mode: "local", reply: localAnalyze(bundle, lastUser, lang) };
  }
}

export async function POST(request: Request) {
  let body: { messages?: unknown; lang?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const lang: Lang = body.lang === "zh" ? "zh" : "en";
  const t = MSG[lang];

  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  let user = null;
  try {
    user = token ? await getSessionUser(token) : null;
  } catch {
    user = null;
  }
  if (!user) {
    return Response.json(
      { ok: false, error: t.unauthorized, code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const messages: ChatMessage[] = rawMessages
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        ((m as ChatMessage).role === "user" ||
          (m as ChatMessage).role === "assistant") &&
        typeof (m as ChatMessage).content === "string"
    )
    .slice(-10);

  if (messages.length === 0) {
    return Response.json({ ok: false, error: t.empty }, { status: 400 });
  }

  const usage = await getUsage(user.id, user.plan);
  if (usage.remaining <= 0) {
    return Response.json(
      { ok: false, error: t.quota(usage.limit), code: "QUOTA_EXCEEDED", usage },
      { status: 429 }
    );
  }

  const bundle: MarketBundle = {
    us: await getUsMarketSnapshot(),
    cn: await getCnMarketSnapshot(),
    asia: await getAsiaMarketSnapshot(),
  };

  const { mode, reply } = await generateReply(bundle, messages, lang);
  const used = await incrementUsage(user.id);

  return Response.json({
    ok: true,
    mode,
    reply,
    usage: { used, limit: usage.limit, remaining: Math.max(0, usage.limit - used) },
  });
}
