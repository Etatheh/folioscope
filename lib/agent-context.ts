// Market context + built-in analyst for the embedded agent.
// Works with no API key: answers are derived from the live snapshots.

import { ASIA_CURRENCY } from "./asia-markets";
import type { UsMarketSnapshot, UsQuote } from "./us-stocks";

export type MarketBundle = {
  us: UsMarketSnapshot;
  cn: UsMarketSnapshot;
  asia: UsMarketSnapshot;
};

type Lang = "zh" | "en";

type Entry = {
  market: "US" | "CN" | "JP/KR";
  quote: UsQuote;
  currency: string;
};

const nf = (n: number, digits = 2) =>
  n.toLocaleString("en-US", { maximumFractionDigits: digits });

function allEntries(bundle: MarketBundle): Entry[] {
  const entries: Entry[] = [];
  for (const q of bundle.us.indices) entries.push({ market: "US", quote: q, currency: "" });
  for (const q of bundle.us.stocks) entries.push({ market: "US", quote: q, currency: "$" });
  for (const q of bundle.cn.indices) entries.push({ market: "CN", quote: q, currency: "" });
  for (const q of bundle.cn.stocks) entries.push({ market: "CN", quote: q, currency: "¥" });
  for (const q of bundle.asia.indices) entries.push({ market: "JP/KR", quote: q, currency: "" });
  for (const q of bundle.asia.stocks) {
    entries.push({ market: "JP/KR", quote: q, currency: ASIA_CURRENCY[q.symbol] ?? "" });
  }
  return entries;
}

export function buildMarketContext(bundle: MarketBundle, lang: Lang): string {
  const lines: string[] = [];
  const addSnapshot = (label: string, snap: UsMarketSnapshot, currency: string) => {
    lines.push(`\n[${label}]`);
    const add = (q: UsQuote, cur: string) => {
      const tech = q.tech;
      const parts = [
        `${q.name}(${q.symbol})`,
        `${cur}${nf(q.price)}`,
        `${q.change >= 0 ? "+" : ""}${nf(q.changePct)}%`,
      ];
      if (tech) {
        if (tech.ma5 !== null) parts.push(`MA5 ${nf(tech.ma5)}`);
        if (tech.ma20 !== null) parts.push(`MA20 ${nf(tech.ma20)}`);
        if (tech.rsi14 !== null) parts.push(`RSI14 ${nf(tech.rsi14, 1)}`);
        if (tech.macd !== null) parts.push(`MACD ${nf(tech.macd)}`);
        if (tech.macdCross) parts.push(tech.macdCross === "golden" ? "金叉" : "死叉");
      }
      if (q.valuation) {
        parts.push(`PE ${nf(q.valuation.pe)}`);
        if (q.valuation.pePercentile !== null) {
          parts.push(`PE分位 ${nf(q.valuation.pePercentile * 100, 0)}%`);
        }
      }
      lines.push(parts.join(" | "));
    };
    for (const q of snap.indices) add(q, "");
    for (const q of snap.stocks) add(q, currency);
  };
  addSnapshot(`${lang === "zh" ? "美股" : "US"}`, bundle.us, "$");
  addSnapshot(`${lang === "zh" ? "A股" : "A-shares"}`, bundle.cn, "¥");
  addSnapshot(`${lang === "zh" ? "日韩" : "Japan/Korea"}`, bundle.asia, "");
  return lines.join("\n");
}

function findEntries(bundle: MarketBundle, query: string): Entry[] {
  const q = query.toLowerCase().replace(/\s/g, "");
  if (!q) return [];
  const hits: Entry[] = [];
  for (const entry of allEntries(bundle)) {
    const quote = entry.quote;
    const targets = [quote.symbol, quote.code, quote.name, quote.nameEn].map((s) =>
      s.toLowerCase()
    );
    if (targets.some((t) => t && (t === q || t.includes(q)))) {
      hits.push(entry);
    }
  }
  return hits.slice(0, 3);
}

function describeEntry(entry: Entry, lang: Lang): string {
  const { quote: q, currency: cur } = entry;
  const tech = q.tech;
  const zh = lang === "zh";
  const lines: string[] = [];
  lines.push(
    `【${q.name} ${q.symbol}】${cur}${nf(q.price)}  ${q.change >= 0 ? "+" : ""}${nf(q.change)} (${q.change >= 0 ? "+" : ""}${nf(q.changePct)}%)`
  );
  lines.push(
    zh
      ? `日内: 开 ${cur}${nf(q.open)} 高 ${cur}${nf(q.high)} 低 ${cur}${nf(q.low)} 昨收 ${cur}${nf(q.prevClose)}`
      : `Day: open ${cur}${nf(q.open)} high ${cur}${nf(q.high)} low ${cur}${nf(q.low)} prev ${cur}${nf(q.prevClose)}`
  );
  if (tech) {
    const above = (v: number | null) =>
      v === null ? "-" : q.price >= v ? (zh ? "上方" : "above") : zh ? "下方" : "below";
    lines.push(
      zh
        ? `均线: MA5 ${nf(tech.ma5 ?? 0)} (${above(tech.ma5)})  MA10 ${nf(tech.ma10 ?? 0)}  MA20 ${nf(tech.ma20 ?? 0)}`
        : `MA: MA5 ${nf(tech.ma5 ?? 0)} (price ${above(tech.ma5)})  MA10 ${nf(tech.ma10 ?? 0)}  MA20 ${nf(tech.ma20 ?? 0)}`
    );
    const rsi = tech.rsi14;
    const rsiLabel =
      rsi === null
        ? "-"
        : rsi >= 70
          ? zh ? "超买" : "overbought"
          : rsi <= 30
            ? zh ? "超卖" : "oversold"
            : zh ? "中性" : "neutral";
    const cross =
      tech.macdCross === "golden"
        ? zh ? "（近期金叉）" : " (golden cross)"
        : tech.macdCross === "dead"
          ? zh ? "（近期死叉）" : " (death cross)"
          : "";
    lines.push(
      `技术: RSI14 ${rsi === null ? "-" : nf(rsi, 1)} (${rsiLabel})  MACD ${tech.macd === null ? "-" : nf(tech.macd)}${cross}`
    );
  } else {
    lines.push(zh ? "技术指标: 暂无历史数据" : "Technicals: no history available");
  }
  if (q.valuation) {
    lines.push(
      zh
        ? `估值: PE ${nf(q.valuation.pe)}  PB ${q.valuation.pb === null ? "-" : nf(q.valuation.pb)}  PE分位 ${q.valuation.pePercentile === null ? "-" : `${nf(q.valuation.pePercentile * 100, 0)}%`}`
        : `Valuation: PE ${nf(q.valuation.pe)}  PB ${q.valuation.pb === null ? "-" : nf(q.valuation.pb)}  PE pctl ${q.valuation.pePercentile === null ? "-" : `${nf(q.valuation.pePercentile * 100, 0)}%`}`
    );
  }
  return lines.join("\n");
}

function overview(bundle: MarketBundle, lang: Lang): string {
  const zh = lang === "zh";
  const lines: string[] = [];
  const idx = (snap: UsMarketSnapshot) =>
    snap.indices
      .map(
        (q) =>
          `${q.name} ${nf(q.price)} (${q.change >= 0 ? "+" : ""}${nf(q.changePct)}%)`
      )
      .join("  ");
  lines.push(zh ? "📊 市场概览" : "📊 Market overview");
  lines.push(`${zh ? "美股" : "US"}: ${idx(bundle.us)}`);
  if (bundle.cn.indices.length) lines.push(`${zh ? "A股" : "A-shares"}: ${idx(bundle.cn)}`);
  if (bundle.asia.indices.length)
    lines.push(`${zh ? "日韩" : "Japan/Korea"}: ${idx(bundle.asia)}`);

  const stocks = bundle.us.stocks
    .filter((q) => Number.isFinite(q.changePct))
    .sort((a, b) => b.changePct - a.changePct);
  if (stocks.length) {
    const top = stocks.slice(0, 3);
    const bottom = stocks.slice(-3).reverse();
    lines.push(
      zh
        ? `\n美股领涨: ${top.map((q) => `${q.name} +${nf(q.changePct)}%`).join(" / ")}`
        : `\nTop gainers: ${top.map((q) => `${q.name} +${nf(q.changePct)}%`).join(" / ")}`
    );
    lines.push(
      zh
        ? `美股领跌: ${bottom.map((q) => `${q.name} ${nf(q.changePct)}%`).join(" / ")}`
        : `Top losers: ${bottom.map((q) => `${q.name} ${nf(q.changePct)}%`).join(" / ")}`
    );
  }
  return lines.join("\n");
}

function valuationSummary(bundle: MarketBundle, lang: Lang): string {
  const zh = lang === "zh";
  const targets = [
    ...bundle.us.indices.filter((q) => q.valuation),
    ...bundle.us.stocks.filter((q) => q.pe !== null),
  ].slice(0, 8);
  if (targets.length === 0) {
    return zh ? "暂无估值数据。" : "No valuation data available.";
  }
  return (
    (zh ? "📈 估值概览\n" : "📈 Valuations\n") +
    targets
      .map((q) => {
        if (q.valuation) {
          return `${q.name}: PE ${nf(q.valuation.pe)}  PB ${q.valuation.pb === null ? "-" : nf(q.valuation.pb)}  PE分位 ${q.valuation.pePercentile === null ? "-" : `${nf(q.valuation.pePercentile * 100, 0)}%`}`;
        }
        return `${q.name}: PE ${nf(q.pe ?? 0)}`;
      })
      .join("\n")
  );
}

function rsiScreener(bundle: MarketBundle, lang: Lang): string {
  const zh = lang === "zh";
  const entries = allEntries(bundle).filter((e) => e.quote.tech?.rsi14 !== null);
  const hot = entries.filter((e) => (e.quote.tech?.rsi14 ?? 50) >= 70);
  const cold = entries.filter((e) => (e.quote.tech?.rsi14 ?? 50) <= 30);
  const lines: string[] = [zh ? "🧭 RSI 扫描" : "🧭 RSI scan"];
  lines.push(
    zh
      ? `超买（RSI≥70）: ${hot.length ? hot.map((e) => `${e.quote.name} ${nf(e.quote.tech!.rsi14!)}`).join(" / ") : "无"}`
      : `Overbought (RSI≥70): ${hot.length ? hot.map((e) => `${e.quote.name} ${nf(e.quote.tech!.rsi14!)}`).join(" / ") : "none"}`
  );
  lines.push(
    zh
      ? `超卖（RSI≤30）: ${cold.length ? cold.map((e) => `${e.quote.name} ${nf(e.quote.tech!.rsi14!)}`).join(" / ") : "无"}`
      : `Oversold (RSI≤30): ${cold.length ? cold.map((e) => `${e.quote.name} ${nf(e.quote.tech!.rsi14!)}`).join(" / ") : "none"}`
  );
  return lines.join("\n");
}

export function localAnalyze(
  bundle: MarketBundle,
  question: string,
  lang: Lang
): string {
  const zh = lang === "zh";
  const q = question.trim().toLowerCase();
  const help = zh
    ? [
        "我是内置的行情分析师（无需 API Key），可以：",
        "• 查个股/指数：直接输入代码或名称，如「AAPL」「茅台」「日经225」",
        "• 市场概览：「概览」或「今日行情」",
        "• 技术面扫描：「RSI」「超买」",
        "• 估值：「估值」「PE」",
        "",
        "想让我更聪明地自由对话？在项目根目录新建 .agent-key 文件，填入 FolioScope AI API Key 即可自动切换为 AI 模式。",
      ].join("\n")
    : [
        "I'm the built-in analyst (no API key needed). I can:",
        "• Look up a stock/index: type a code or name, e.g. AAPL, 600519, Nikkei",
        "• Overview: 'overview' or 'market today'",
        "• Technical scan: 'RSI' or 'overbought'",
        "• Valuations: 'valuation' or 'PE'",
        "",
        "Want free-form AI answers? Create a .agent-key file in the project root with your FolioScope AI API key.",
      ].join("\n");

  if (!q) return help;

  const entries = findEntries(bundle, q);
  if (entries.length > 0) {
    return entries.map((entry) => describeEntry(entry, lang)).join("\n\n");
  }

  if (/概览|大盘|今日行情|行情怎么样|市场怎么样|overview|market today|how.*market/.test(q)) {
    return overview(bundle, lang);
  }
  if (/估值|pe|pb|valuation/.test(q)) {
    return valuationSummary(bundle, lang);
  }
  if (/rsi|超买|超卖|overbought|oversold|技术面|technical/.test(q)) {
    return rsiScreener(bundle, lang);
  }
  if (/模拟|backtest|portfolio|组合/.test(q)) {
    return zh
      ? "📉 投资模拟器在仪表盘「投资模拟」区块：可选股、调权重、回测近1年真实历史数据，并与标普500对比。\n\n如果需要我分析某个组合，告诉我股票代码即可。"
      : "📉 The Investment Simulator is on the dashboard (Simulator section): pick stocks, set weights, backtest the last year against real history and compare with the S&P 500.";
  }
  if (/推荐|建议|买|卖|recommend|buy|sell|advice/.test(q)) {
    return zh
      ? "⚠️ 我不提供投资建议。不过可以给你数据参考：\n" +
          overview(bundle, lang) +
          "\n\n" +
          valuationSummary(bundle, lang)
      : "⚠️ I don't give investment advice. Data for reference:\n" +
          overview(bundle, lang) +
          "\n\n" +
          valuationSummary(bundle, lang);
  }
  return help;
}
