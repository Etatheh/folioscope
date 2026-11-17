import YahooFinance from "yahoo-finance2";
import type { QuoteSummaryResult } from "yahoo-finance2/modules/quoteSummary";

import { isProTier } from "@/lib/access";
import { completionsUrl, readAiConfig, type AiConfig } from "@/lib/server/ai-config";
import { resolveRequestUser } from "@/lib/server/request-user";
import {
  readStockReportCache,
  writeStockReportCache,
} from "@/lib/server/stock-report-cache";
import {
  STOCK_REPORT_TTL_MS,
  type BilingualList,
  type BilingualText,
  type EpsQuarter,
  type StockFinancials,
  type StockReport,
  type StockReportResult,
} from "@/lib/stock-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Lang = "zh" | "en";

const MSG = {
  zh: {
    unauthorized: "请先登录后再查看 AI 财报分析。",
    forbidden: "AI 财报分析为 Pro 专属功能，请升级后再试。",
    badSymbol: "股票代码格式不正确。",
    notConfigured:
      "AI 服务尚未配置。请在环境变量中设置 AI_API_KEY、AI_BASE_URL 和 AI_MODEL_NAME。",
    upstream: "AI 服务暂时不可用，请稍后再试。",
    dataUnavailable: "暂时无法获取该股票的财报数据，请稍后重试。",
    badReport: "AI 返回的研报结构无法解析，请稍后重试。",
  },
  en: {
    unauthorized: "Please log in to view the AI earnings report.",
    forbidden: "The AI earnings report is a Pro feature. Upgrade to continue.",
    badSymbol: "Invalid stock symbol.",
    notConfigured:
      "The AI service is not configured. Set AI_API_KEY, AI_BASE_URL and AI_MODEL_NAME.",
    upstream: "The AI service is temporarily unavailable. Please try again.",
    dataUnavailable: "Fundamental data is temporarily unavailable for this symbol.",
    badReport: "The AI returned an unreadable report structure. Please retry.",
  },
} as const;

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const YAHOO_MODULES = [
  "financialData",
  "defaultKeyStatistics",
  "earnings",
  "summaryDetail",
] as const;

function jsonError(message: string, status: number, code?: string) {
  return Response.json(
    { ok: false, error: message, code },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function normalizeSymbol(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const symbol = raw.trim().toUpperCase();
  // Yahoo tickers: letters/digits plus . - = ^ for classes and indices.
  return /^[A-Z0-9.\-=^]{1,20}$/.test(symbol) ? symbol : null;
}

function num(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[,%]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

type QuoteSummary = QuoteSummaryResult;

function extractFinancials(symbol: string, summary: QuoteSummary): StockFinancials {
  const fd = summary.financialData;
  const stats = summary.defaultKeyStatistics;
  const detail = summary.summaryDetail;
  const earnings = summary.earnings;

  const price =
    num(fd?.currentPrice) ??
    num(detail?.fulldayPrice) ??
    num(detail?.previousClose);
  const epsTrailing = num(stats?.trailingEps);
  const quarterSource = earnings?.earningsChart?.quarterly ?? [];
  const epsQuarters: EpsQuarter[] = quarterSource
    .filter((quarter) => num(quarter.actual) !== null)
    .slice(-4)
    .map((quarter) => {
      const actual = num(quarter.actual);
      const estimate = num(quarter.estimate);
      const reported = num(quarter.surprisePct);
      const computed =
        reported !== null
          ? reported
          : actual !== null && estimate !== null && estimate !== 0
            ? ((actual - estimate) / Math.abs(estimate)) * 100
            : null;
      return {
        period:
          quarter.fiscalQuarter ||
          quarter.calendarQuarter ||
          quarter.date ||
          "—",
        actual,
        estimate,
        surprisePct: computed,
      };
    });

  return {
    symbol,
    currency:
      detail?.currency ?? fd?.financialCurrency ?? earnings?.financialCurrency ?? "USD",
    price,
    marketCap: num(detail?.marketCap),
    revenue: num(fd?.totalRevenue),
    revenueGrowth: num(fd?.revenueGrowth),
    grossMargin: num(fd?.grossMargins),
    freeCashflow: num(fd?.freeCashflow),
    pe:
      num(detail?.trailingPE) ??
      (price !== null && epsTrailing !== null && epsTrailing > 0
        ? price / epsTrailing
        : null),
    forwardPe: num(detail?.forwardPE) ?? num(stats?.forwardPE),
    pb: num(stats?.priceToBook),
    epsTrailing,
    week52Low: num(detail?.fiftyTwoWeekLow),
    week52High: num(detail?.fiftyTwoWeekHigh),
    epsQuarters,
    analyst: {
      targetMeanPrice: num(fd?.targetMeanPrice),
      recommendationKey: fd?.recommendationKey ?? null,
      numberOfAnalystOpinions: num(fd?.numberOfAnalystOpinions),
    },
    asOf: new Date().toISOString(),
  };
}

async function fetchFinancials(symbol: string): Promise<StockFinancials> {
  const summary = (await yahooFinance.quoteSummary(
    symbol,
    { modules: [...YAHOO_MODULES] },
    {
      // Yahoo's response schema drifts; extract defensively instead of failing
      // the whole request when a new optional field appears.
      validateResult: false,
      fetchOptions: { signal: AbortSignal.timeout(20_000) },
    }
  )) as QuoteSummaryResult;
  return extractFinancials(symbol, summary);
}

const SYSTEM_PROMPT = `You are a senior equity research analyst writing a fundamental earnings report for retail investors.

Rules:
- Use ONLY the Yahoo Finance data provided. Never invent or extrapolate figures.
- If a metric is missing, explicitly say "数据缺失 / data unavailable" instead of guessing.
- Write in both Simplified Chinese (zh) and English (en). The two versions must carry the same meaning.
- Return STRICT JSON only, with no markdown, no code fences and no extra text.
- JSON shape:
{
  "summary": { "zh": "2-3 sentence overview", "en": "2-3 sentence overview" },
  "highlights": {
    "zh": ["3-5 concise financial highlights"],
    "en": ["the same 3-5 highlights in English"]
  },
  "valuation": { "zh": "one paragraph on PE/PB, 52-week range and where the stock sits", "en": "same in English" },
  "risks": {
    "zh": ["3-5 concrete risks grounded in the data"],
    "en": ["the same 3-5 risks in English"]
  },
  "verdict": { "zh": "one balanced closing sentence", "en": "same in English" }
}

Style: professional, specific, numeric, concise. No buy/sell recommendation and no price target.`;

function buildUserPrompt(financials: StockFinancials): string {
  const payload = {
    ...financials,
    revenueGrowthPct:
      financials.revenueGrowth === null ? null : financials.revenueGrowth * 100,
    grossMarginPct:
      financials.grossMargin === null ? null : financials.grossMargin * 100,
    note: "revenueGrowthPct / grossMarginPct / surprisePct are percentages. Monetary values use the listed currency.",
  };
  return `Produce the bilingual fundamental earnings report for ${financials.symbol}.

Yahoo Finance data:
${JSON.stringify(payload, null, 2)}`;
}

type ChatCompletionResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string } | string;
};

class AiUpstreamError extends Error {}
class ReportFormatError extends Error {}

async function callDeepSeek(
  config: AiConfig,
  financials: StockFinancials
): Promise<string> {
  const body = {
    model: config.model,
    temperature: 0.35,
    max_tokens: 2_000,
    stream: false,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(financials) },
    ],
  };

  const send = async (withJsonMode: boolean) => {
    const payload = { ...body } as Record<string, unknown>;
    if (!withJsonMode) delete payload.response_format;
    return fetch(completionsUrl(config.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.key}`,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });
  };

  let upstream = await send(true);
  // Some OpenAI-compatible gateways do not implement response_format.
  if (!upstream.ok && (upstream.status === 400 || upstream.status === 422)) {
    upstream = await send(false);
  }
  if (!upstream.ok) {
    const detail = (await upstream.text()).slice(0, 500);
    throw new AiUpstreamError(`AI upstream ${upstream.status}: ${detail}`);
  }

  const data = (await upstream.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw new AiUpstreamError(
      `AI returned an empty answer${
        data.error ? `: ${typeof data.error === "string" ? data.error : data.error.message}` : ""
      }`
    );
  }
  return content;
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const attempts = [cleaned];
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) attempts.push(cleaned.slice(start, end + 1));

  for (const attempt of attempts) {
    try {
      const value = JSON.parse(attempt) as unknown;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
    } catch {
      // try the next candidate
    }
  }
  return null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function localizedText(value: unknown): BilingualText | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const zh = text(record.zh);
  const en = text(record.en);
  if (!zh && !en) return null;
  return { zh: zh || en, en: en || zh };
}

function localizedList(value: unknown): BilingualList | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const pick = (raw: unknown): string[] => {
    if (Array.isArray(raw)) {
      return raw.map(text).filter(Boolean).slice(0, 5);
    }
    const line = text(raw);
    return line ? [line] : [];
  };
  const zh = pick(record.zh);
  const en = pick(record.en);
  if (zh.length === 0 && en.length === 0) return null;
  return { zh: zh.length > 0 ? zh : en, en: en.length > 0 ? en : zh };
}

function normalizeReport(raw: string): StockReport {
  const parsed = parseJsonObject(raw);
  if (!parsed) throw new ReportFormatError("report is not valid JSON");

  const summary = localizedText(parsed.summary);
  const highlights = localizedList(parsed.highlights);
  const valuation = localizedText(parsed.valuation);
  const risks = localizedList(parsed.risks);
  const verdict = localizedText(parsed.verdict);

  if (!summary || !highlights || !valuation || !risks || !verdict) {
    throw new ReportFormatError("report is missing required sections");
  }

  return { summary, highlights, valuation, risks, verdict };
}

async function handleStockReport(
  request: Request,
  rawSymbol: unknown
): Promise<Response> {
  const url = new URL(request.url);
  const lang: Lang = url.searchParams.get("lang") === "zh" ? "zh" : "en";
  const t = MSG[lang];

  const session = await resolveRequestUser(request);
  const user = session?.user ?? null;
  if (!user) {
    return jsonError(t.unauthorized, 401, "UNAUTHORIZED");
  }
  if (!isProTier(user.tier)) {
    return jsonError(t.forbidden, 403, "UPGRADE_REQUIRED");
  }

  const symbol = normalizeSymbol(rawSymbol);
  if (!symbol) {
    return jsonError(t.badSymbol, 400, "BAD_SYMBOL");
  }

  // 1) 24-hour cache hit: return immediately without touching Yahoo or the LLM.
  const cached = await readStockReportCache(symbol);
  if (cached) {
    const response: StockReportResult & { ok: true; cached: true } = {
      ok: true,
      cached: true,
      ...cached,
    };
    return Response.json(response, {
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const config = readAiConfig();
  if (!config) {
    return jsonError(t.notConfigured, 503, "AI_NOT_CONFIGURED");
  }

  let financials: StockFinancials;
  try {
    financials = await fetchFinancials(symbol);
  } catch (error) {
    console.error(`[ai/stock-report] Yahoo Finance failed for ${symbol}`, error);
    return jsonError(t.dataUnavailable, 502, "DATA_UNAVAILABLE");
  }

  let report: StockReport;
  try {
    report = normalizeReport(await callDeepSeek(config, financials));
  } catch (error) {
    console.error(`[ai/stock-report] DeepSeek failed for ${symbol}`, error);
    if (error instanceof ReportFormatError) {
      return jsonError(t.badReport, 502, "BAD_REPORT");
    }
    return jsonError(t.upstream, 502, "UPSTREAM_ERROR");
  }

  const generatedAt = new Date().toISOString();
  const result: StockReportResult = {
    symbol,
    report,
    financials,
    model: config.model,
    generatedAt,
    expiresAt: new Date(Date.now() + STOCK_REPORT_TTL_MS).toISOString(),
  };

  await writeStockReportCache(result);

  return Response.json(
    { ok: true, cached: false, ...result },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function GET(request: Request) {
  const symbol = new URL(request.url).searchParams.get("symbol");
  return handleStockReport(request, symbol);
}

export async function POST(request: Request) {
  let body: { symbol?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    const lang: Lang = new URL(request.url).searchParams.get("lang") === "zh" ? "zh" : "en";
    return jsonError(MSG[lang].badSymbol, 400, "BAD_JSON");
  }
  return handleStockReport(request, body.symbol);
}