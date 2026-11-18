import type { Lang } from "./i18n";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatIndexContext = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  pe?: number | null;
  pePercentile?: number | null;
};

export type ChatDcaContext = {
  target: "sp500" | "nasdaq";
  targetName: string;
  period: string;
  months: number;
  monthly: number;
  invested?: number;
  finalValue?: number;
  totalReturn?: number;
  xirr?: number | null;
  benchmark?: string;
};

export type ChatSimulatorHolding = {
  symbol: string;
  weight: number;
};

export type ChatSimulatorContext = {
  mode: "lump" | "dca";
  period: string;
  months: number;
  capital: number;
  contribution?: number;
  frequency?: "weekly" | "biweekly" | "monthly";
  holdings: ChatSimulatorHolding[];
  invested?: number;
  finalValue?: number;
  totalReturn?: number;
  maxDrawdown?: number;
  cagr?: number | null;
  benchmark?: string;
};

export type ChatFocusedContext = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  currency?: string;
  open?: number;
  high?: number;
  low?: number;
  prevClose?: number;
  pe?: number | null;
  pb?: number | null;
  pePercentile?: number | null;
  week52Low?: number | null;
  week52High?: number | null;
  ma5?: number | null;
  ma10?: number | null;
  ma20?: number | null;
  rsi14?: number | null;
  macd?: number | null;
  macdCross?: "golden" | "dead" | null;
};

export type ChatMarketContext = {
  page?: string;
  asOf?: number;
  lang?: Lang;
  indices: ChatIndexContext[];
  dca?: ChatDcaContext | null;
  simulator?: ChatSimulatorContext | null;
  focused?: ChatFocusedContext | null;
};

export const COMPLIANCE_NOTE: Record<Lang, string> = {
  zh: "仅供参考，不构成投资建议。",
  en: "For reference only — not investment advice.",
};

const MAX_MESSAGES = 16;
const MAX_MESSAGE_CHARS = 4_000;
const MAX_TOTAL_CHARS = 18_000;

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeText(value: unknown, max = 120): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function optionalNumber(value: unknown): number | null | undefined {
  if (value === null) return null;
  const n = finite(value);
  return n === null ? undefined : n;
}

/** Keep only user/assistant turns, drop empties and cap size/count. */
export function normalizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const messages: ChatMessage[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string") continue;
    const text = content.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!text) continue;
    messages.push({ role, content: text });
  }

  let start = Math.max(0, messages.length - MAX_MESSAGES);
  let total = messages.slice(start).reduce((sum, m) => sum + m.content.length, 0);
  while (start < messages.length - 1 && total > MAX_TOTAL_CHARS) {
    total -= messages[start].content.length;
    start += 1;
  }
  return messages.slice(start);
}

/** Validate the live page context sent by the browser. */
export function normalizeMarketContext(raw: unknown): ChatMarketContext {
  const empty: ChatMarketContext = { indices: [] };
  if (!raw || typeof raw !== "object") return empty;
  const input = raw as Record<string, unknown>;

  const indices: ChatIndexContext[] = [];
  if (Array.isArray(input.indices)) {
    for (const item of input.indices.slice(0, 12)) {
      if (!item || typeof item !== "object") continue;
      const value = item as Record<string, unknown>;
      const price = finite(value.price);
      const changePct = finite(value.changePct);
      const symbol = safeText(value.symbol, 24);
      const name = safeText(value.name, 64);
      if (!symbol || !name || price === null || changePct === null) continue;
      indices.push({
        symbol,
        name,
        price,
        changePct,
        pe: optionalNumber(value.pe),
        pePercentile: optionalNumber(value.pePercentile),
      });
    }
  }

  let dca: ChatDcaContext | null = null;
  if (input.dca && typeof input.dca === "object") {
    const value = input.dca as Record<string, unknown>;
    const target = value.target === "nasdaq" ? "nasdaq" : "sp500";
    const monthly = finite(value.monthly);
    const months = finite(value.months);
    if (monthly !== null && months !== null) {
      dca = {
        target,
        targetName:
          safeText(value.targetName, 40) || (target === "sp500" ? "S&P 500" : "Nasdaq 100"),
        period: safeText(value.period, 24) || `${months}M`,
        months: Math.max(1, Math.min(240, Math.round(months))),
        monthly: Math.max(0, Math.min(1_000_000, monthly)),
        invested: optionalNumber(value.invested) ?? undefined,
        finalValue: optionalNumber(value.finalValue) ?? undefined,
        totalReturn: optionalNumber(value.totalReturn) ?? undefined,
        xirr: optionalNumber(value.xirr),
        benchmark: safeText(value.benchmark, 40) || undefined,
      };
    }
  }

  let simulator: ChatSimulatorContext | null = null;
  if (input.simulator && typeof input.simulator === "object") {
    const value = input.simulator as Record<string, unknown>;
    const capital = finite(value.capital);
    const months = finite(value.months);
    if (capital !== null && months !== null) {
      const holdings: ChatSimulatorHolding[] = [];
      if (Array.isArray(value.holdings)) {
        for (const item of value.holdings.slice(0, 16)) {
          if (!item || typeof item !== "object") continue;
          const holding = item as Record<string, unknown>;
          const symbol = safeText(holding.symbol, 16);
          const weight = finite(holding.weight);
          if (!symbol || weight === null) continue;
          holdings.push({ symbol, weight: Math.max(0, Math.min(100, weight)) });
        }
      }
      const frequency =
        value.frequency === "weekly" ||
        value.frequency === "biweekly" ||
        value.frequency === "monthly"
          ? value.frequency
          : undefined;
      simulator = {
        mode: value.mode === "dca" ? "dca" : "lump",
        period: safeText(value.period, 24) || `${Math.round(months)}M`,
        months: Math.max(1, Math.min(240, Math.round(months))),
        capital: Math.max(0, Math.min(1_000_000_000, capital)),
        contribution: optionalNumber(value.contribution) ?? undefined,
        frequency,
        holdings,
        invested: optionalNumber(value.invested) ?? undefined,
        finalValue: optionalNumber(value.finalValue) ?? undefined,
        totalReturn: optionalNumber(value.totalReturn) ?? undefined,
        maxDrawdown: optionalNumber(value.maxDrawdown) ?? undefined,
        cagr: optionalNumber(value.cagr),
        benchmark: safeText(value.benchmark, 40) || undefined,
      };
    }
  }

  let focused: ChatFocusedContext | null = null;
  if (input.focused && typeof input.focused === "object") {
    const value = input.focused as Record<string, unknown>;
    const symbol = safeText(value.symbol, 24);
    const name = safeText(value.name, 64);
    const price = finite(value.price);
    const changePct = finite(value.changePct);
    if (symbol && name && price !== null && changePct !== null) {
      const cross = value.macdCross;
      focused = {
        symbol,
        name,
        price,
        changePct,
        currency: safeText(value.currency, 8) || undefined,
        open: optionalNumber(value.open) ?? undefined,
        high: optionalNumber(value.high) ?? undefined,
        low: optionalNumber(value.low) ?? undefined,
        prevClose: optionalNumber(value.prevClose) ?? undefined,
        pe: optionalNumber(value.pe),
        pb: optionalNumber(value.pb),
        pePercentile: optionalNumber(value.pePercentile),
        week52Low: optionalNumber(value.week52Low),
        week52High: optionalNumber(value.week52High),
        ma5: optionalNumber(value.ma5),
        ma10: optionalNumber(value.ma10),
        ma20: optionalNumber(value.ma20),
        rsi14: optionalNumber(value.rsi14),
        macd: optionalNumber(value.macd),
        macdCross: cross === "golden" || cross === "dead" ? cross : null,
      };
    }
  }

  return {
    page: safeText(input.page, 32) || undefined,
    asOf: finite(input.asOf) ?? undefined,
    lang: input.lang === "zh" ? "zh" : input.lang === "en" ? "en" : undefined,
    indices,
    dca,
    simulator,
    focused,
  };
}

const nf = (value: number, digits = 2) =>
  value.toLocaleString("en-US", { maximumFractionDigits: digits });

function pct(value: number) {
  return `${value >= 0 ? "+" : ""}${nf(value)}%`;
}

/** Human-readable context block appended to the system prompt. */
export function formatMarketContext(context: ChatMarketContext, lang: Lang): string {
  const zh = lang === "zh";
  const lines: string[] = [];

  if (context.asOf) {
    lines.push(
      `${zh ? "数据时间" : "Data timestamp"}: ${new Date(context.asOf).toISOString()}`
    );
  }
  if (context.page) {
    lines.push(`${zh ? "页面" : "Page"}: ${context.page}`);
  }

  if (context.indices.length > 0) {
    lines.push(`\n[${zh ? "美股指数 / 页面行情" : "US indices / page quotes"}]`);
    for (const index of context.indices) {
      const extras: string[] = [];
      if (typeof index.pe === "number") extras.push(`PE ${nf(index.pe)}`);
      if (typeof index.pePercentile === "number") {
        extras.push(
          `PE ${zh ? "分位" : "percentile"} ${nf(index.pePercentile * 100, 0)}%`
        );
      }
      lines.push(
        `- ${index.name} (${index.symbol}): ${nf(index.price)} (${pct(
          index.changePct
        )})${extras.length ? `, ${extras.join(", ")}` : ""}`
      );
    }
  }

  if (context.dca) {
    const d = context.dca;
    lines.push(`\n[${zh ? "当前定投回测方案" : "Current DCA backtest plan"}]`);
    lines.push(
      `- ${zh ? "标的" : "Target"}: ${d.targetName} (${d.target})`
    );
    lines.push(
      `- ${zh ? "周期" : "Period"}: ${d.period} (${d.months} ${
        zh ? "个月" : "months"
      })`
    );
    lines.push(
      `- ${zh ? "每月定投" : "Monthly contribution"}: $${nf(d.monthly, 0)}`
    );
    if (typeof d.invested === "number") {
      lines.push(`- ${zh ? "累计投入" : "Invested"}: $${nf(d.invested, 0)}`);
    }
    if (typeof d.finalValue === "number") {
      lines.push(`- ${zh ? "期末市值" : "Final value"}: $${nf(d.finalValue, 0)}`);
    }
    if (typeof d.totalReturn === "number") {
      lines.push(
        `- ${zh ? "总收益" : "Total return"}: ${pct(d.totalReturn * 100)}`
      );
    }
    if (typeof d.xirr === "number") {
      lines.push(`- XIRR: ${pct(d.xirr * 100)}`);
    }
    if (d.benchmark) {
      lines.push(`- ${zh ? "对比基准" : "Comparison benchmark"}: ${d.benchmark}`);
    }
    if (typeof d.invested !== "number") {
      lines.push(
        `- ${zh ? "回测结果：当前套餐未解锁（仅方案参数可用）" : "Backtest results: locked on the current plan (only plan inputs are available)"}`
      );
    }
  }

  if (context.simulator) {
    const s = context.simulator;
    lines.push(`\n[Current portfolio backtest]`);
    lines.push(`- Mode: ${s.mode === "dca" ? "DCA" : "Lump sum"}`);
    lines.push(`- Period: ${s.period} (${s.months} months)`);
    lines.push(`- Starting capital: $${nf(s.capital, 0)}`);
    if (s.mode === "dca" && typeof s.contribution === "number") {
      lines.push(
        `- Contribution: $${nf(s.contribution, 0)} ${s.frequency ?? "monthly"}`
      );
    }
    if (s.holdings.length) {
      lines.push(
        `- Holdings: ${s.holdings
          .map((holding) => `${holding.symbol} ${nf(holding.weight, 1)}%`)
          .join(", ")}`
      );
    }
    if (typeof s.invested === "number") {
      lines.push(`- Invested: $${nf(s.invested, 0)}`);
    }
    if (typeof s.finalValue === "number") {
      lines.push(`- Final value: $${nf(s.finalValue, 0)}`);
    }
    if (typeof s.totalReturn === "number") {
      lines.push(`- Total return: ${pct(s.totalReturn * 100)}`);
    }
    if (typeof s.maxDrawdown === "number") {
      lines.push(`- Max drawdown: -${nf(s.maxDrawdown * 100)}%`);
    }
    if (typeof s.cagr === "number") {
      lines.push(`- CAGR: ${pct(s.cagr * 100)}`);
    }
    if (s.benchmark) {
      lines.push(`- Benchmark: ${s.benchmark}`);
    }
    lines.push(
      s.mode === "dca" && typeof s.invested !== "number"
        ? "- Backtest results: not available in the current sync"
        : "- Backtest results: as computed by the live simulator"
    );
  }

  if (context.focused) {
    const q = context.focused;
    const cur = q.currency ?? "";
    lines.push(`\n[${zh ? "当前查看标的" : "Focused instrument"}]`);
    lines.push(
      `- ${q.name} (${q.symbol}): ${cur}${nf(q.price)} (${pct(q.changePct)})`
    );
    const day: string[] = [];
    if (typeof q.open === "number") day.push(`${zh ? "开" : "open"} ${cur}${nf(q.open)}`);
    if (typeof q.high === "number") day.push(`${zh ? "高" : "high"} ${cur}${nf(q.high)}`);
    if (typeof q.low === "number") day.push(`${zh ? "低" : "low"} ${cur}${nf(q.low)}`);
    if (typeof q.prevClose === "number") {
      day.push(`${zh ? "昨收" : "prev close"} ${cur}${nf(q.prevClose)}`);
    }
    if (day.length) lines.push(`- ${day.join(", ")}`);
    if (typeof q.pe === "number") {
      const pb = typeof q.pb === "number" ? `, PB ${nf(q.pb)}` : "";
      const pctl =
        typeof q.pePercentile === "number"
          ? `, PE ${zh ? "分位" : "percentile"} ${nf(q.pePercentile * 100, 0)}%`
          : "";
      lines.push(`- PE ${nf(q.pe)}${pb}${pctl}`);
    }
    if (
      typeof q.ma5 === "number" ||
      typeof q.ma20 === "number" ||
      typeof q.rsi14 === "number"
    ) {
      const tech: string[] = [];
      if (typeof q.ma5 === "number") tech.push(`MA5 ${nf(q.ma5)}`);
      if (typeof q.ma20 === "number") tech.push(`MA20 ${nf(q.ma20)}`);
      if (typeof q.rsi14 === "number") tech.push(`RSI14 ${nf(q.rsi14, 1)}`);
      if (typeof q.macd === "number") tech.push(`MACD ${nf(q.macd)}`);
      lines.push(`- ${tech.join(", ")}`);
    }
    if (q.macdCross) {
      lines.push(
        `- ${q.macdCross === "golden" ? (zh ? "近期金叉" : "recent golden cross") : zh ? "近期死叉" : "recent death cross"}`
      );
    }
  }

  if (lines.length === 0) {
    return zh ? "（当前页面暂无可用行情数据）" : "(no live page data available)";
  }
  return lines.join("\n").slice(0, 6_000);
}

export type ChatPromptMode = "chat" | "diagnosis";

/**
 * Extra contract for the proactive "instant diagnosis" that runs when the
 * drawer opens or the refresh action is tapped. It replaces the old generic
 * welcome menu with a short, data-grounded read of the current page.
 */
const DIAGNOSIS_CONTRACT = [
  "=== INSTANT DIAGNOSIS MODE ===",
  "The panel just opened or was refreshed. Do not ask the user what they want, do not offer a menu, and never list example questions.",
  "Immediately diagnose the live page setup using only the data above. Keep the whole answer under 150 words with short paragraphs.",
  "Use exactly these three bold section labels, each on its own line, in this order:",
  "**Key Takeaway** — one sentence verdict on the current setup or data.",
  "**Risk / Concentration Check** — one specific insight grounded strictly in the live page numbers. Never invent, estimate or infer locked, missing or unavailable outputs; if a figure is unavailable, state that it is unavailable.",
  "**Next Action** — one concrete adjustment the user can make now, or one focused question to explore next.",
  "No preamble, no tables, no closing summary. Follow the reply language already specified above.",
].join("\n");

/** The FolioScope AI persona and answer contract. */
export function buildSystemPrompt(
  lang: Lang,
  options: { mode?: ChatPromptMode } = {}
): string {
  let prompt: string;
  if (lang === "zh") {
    prompt = [
      "你名为 “FolioScope AI”，是一位专业、客观的美股与资产配置分析助手，内嵌在 FolioScope 行情看板中。",
      "请结合下方提供的实时页面数据（美股指数、估值、当前查看标的、定投回测方案）回答用户问题。",
      "要求：使用简洁、结构化的 Markdown 要点（可用 **加粗** 和列表），先给结论，再给依据；不要编造数据，缺失时明确说明。",
      "不要提供个性化投资建议、买卖指令或收益承诺。",
      "用简体中文回答。",
      `在回答末尾单独一行附上简短合规提示，格式为：“> ${COMPLIANCE_NOTE.zh}”。`,
    ].join("\n");
  } else {
    prompt = [
      'You are "FolioScope AI", a professional and objective US equities and asset-allocation analysis assistant embedded in the FolioScope market dashboard.',
      "Combine the live page data below (US indices, valuations, focused instrument, current DCA backtest plan) with the user's question.",
      "Use concise, structured Markdown with **bold** labels and bullet lists. Lead with the conclusion, then the evidence. Never invent missing data; say so explicitly.",
      "Do not give personalised investment advice, buy/sell instructions or return promises.",
      "Reply in English.",
      `End with a separate final line in this exact form: "> ${COMPLIANCE_NOTE.en}"`,
    ].join("\n");
  }

  return options.mode === "diagnosis"
    ? `${prompt}\n\n${DIAGNOSIS_CONTRACT}`
    : prompt;
}

export function hasComplianceNote(text: string, lang: Lang): boolean {
  const normalized = text.toLowerCase();
  if (lang === "zh") {
    return normalized.includes("不构成投资建议") || normalized.includes("仅供参考");
  }
  return (
    normalized.includes("not investment advice") ||
    normalized.includes("for reference only")
  );
}