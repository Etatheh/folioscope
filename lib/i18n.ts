export type Lang = "zh" | "en";

export function parseLang(value?: string | string[]): Lang {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "zh" ? "zh" : "en";
}

const zh = {
  nav: {
    overview: "总览",
    markets: "美股行情",
    cn: "A股行情",
    asia: "日韩股市",
    investments: "投资模拟",
    projects: "项目",
    learning: "学习",
  },
  boards: {
    cn: { title: "A股行情", titleEn: "A-Shares" },
    asia: { title: "日韩股市", titleEn: "Japan & Korea" },
  },  settings: "设置",
  backToSite: "返回网站",
  eyebrow: "个人指挥中心",
  greeting: "早上好，GUI",
  stats: {
    portfolio: "投资组合估值",
    ai: "AI 项目",
    learning: "学习时长",
  },
  activity: {
    title: "最近动态",
    viewAll: "查看全部",
    items: [
      { title: "发布了个人网站", time: "2 小时前" },
      { title: "完成 AI Agents 课程", time: "昨天" },
      { title: "投资组合创新高", time: "3 天前" },
    ],
    weeklyFocus: "每周重点",
    weeklyFocusText: "发布 Research Copilot 的第一个可用版本。",
  },
  projects: {
    title: "进行中的项目",
    subtitle: "你正在构建的项目一览",
    newProject: "+ 新建项目",
    statuses: {
      live: "已上线",
      building: "开发中",
      planning: "进行中",
    },
  },
  markets: {
    title: "美股行情",
    live: "实时行情",
    demo: "示例数据",
    demoNote: "实时接口暂不可用，当前展示最近一次行情快照",
    updated: "更新于",
    source: "数据来源：腾讯行情",
    indicatorsHint: "技术指标：MA / RSI14 / MACD · 点击卡片查看详情",
    disclaimer: "仅供参考，不构成投资建议",
    high: "高",
    low: "低",
    open: "今开",
    highLabel: "最高",
    lowLabel: "最低",
    marketCap: "市值",
    pe: "市盈率",
    week52: "52周",
    valuationBy: "估值数据：蛋卷基金",
    peShort: "PE",
    pbShort: "PB",
    percentile: "分位",
    percentileTip: "当前PE处于历史分位，数值越低估值越便宜",
    cheap: "低估",
    fair: "适中",
    rich: "高估",
    goldenCross: "金叉",
    deathCross: "死叉",
    rsiOverbought: "超买",
    rsiOversold: "超卖",
    rsiNeutral: "中性",
    above: (label: string) => `价格高于${label}`,
    below: (label: string) => `价格低于${label}`,
    macdTip: "MACD DIF 值",
    noData: "行情数据暂不可用，请稍后刷新重试。",
    viewDetail: "查看详情",
    unlockAll: "解锁全部股票",
    unlockHint: "免费版每个市场可看 4 只股票",
    registerCta: "免费注册解锁更多",
    upgradeCta: "升级 Pro 解锁全部",
  },
  detail: {
    backToDashboard: "← 返回 Dashboard",
    open: "今开",
    prevClose: "昨收",
    high: "最高",
    low: "最低",
    volume: "成交量",
    marketCap: "市值",
    pe: "市盈率",
    week52: "52周区间",
    exchangeTime: "交易所时间",
    dailyKline: "日K线",
    klineSubtitle: "近 60 个交易日 · MA5 / MA10 / MA20 叠加 · 悬停查看每日数据",
    daily: "日线",
    noKline: "暂无K线数据（行情接口暂不可用）",
    techUnavailable: "技术指标暂不可用",
    hoverHint: "悬停查看每日数据",
    openC: "开",
    highC: "高",
    lowC: "低",
    closeC: "收",
    lockedTitle: "该标的仅对 Pro 开放",
    lockedBody: "免费版每个市场可看 4 只股票，升级 Pro 解锁全部。",
  },
  simulator: {
    title: "投资模拟器",
    subtitle: "用历史日线数据回测你的选股与配置（非真实交易）",
    capital: "初始资金",
    range: ["1个月", "3个月", "6个月", "1年"],
    pickStocks: "选择股票",
    equalWeight: "等权分配",
    maxDrawdown: "最大回撤",
    finalValue: "期末估值",
    totalReturn: "总收益率",
    benchmark: "对比",
    vsBenchmark: "相对标普500",
    chartTitle: "模拟净值走势",
    legendPortfolio: "模拟组合",
    legendBenchmark: "标普500",
    empty: "请至少选择一只股票",
    weight: "权重",
    disclaimer: "模拟结果仅用于学习参考，不构成投资建议。",
    days: "个交易日",
    proRange: "6个月 / 1年长周期回测为 Pro 功能",
    upgrade: "升级 Pro",
  },
  agent: {
    title: "AI 行情助手",
    subtitle: "基于实时行情数据",
    open: "AI 助手",
    placeholder: "问行情、个股、指标…",
    send: "发送",
    thinking: "分析中…",
    welcome: "你好！我是内置行情助手，可以直接问我：",
    quick: ["市场概览", "AAPL", "RSI 扫描", "纳指100 估值"],
    error: "请求失败，请稍后再试。",
    limitReached: "免费版每天可提问 5 次，升级 Pro 解锁无限对话。",
    upgrade: "升级 Pro",
    quota: (remaining: number, limit: number) => `今日剩余 ${remaining}/${limit} 次提问`,
  },
  user: {
    login: "登录",
    upgrade: "升级 Pro",
    logout: "退出登录",
    pro: "PRO 会员",
    free: "免费版",
  },
};

type Dict = {
  nav: Record<"overview" | "markets" | "cn" | "asia" | "investments" | "projects" | "learning", string>;
  boards: {
    cn: { title: string; titleEn: string };
    asia: { title: string; titleEn: string };
  };
  settings: string;
  backToSite: string;
  eyebrow: string;
  greeting: string;
  stats: Record<"portfolio" | "ai" | "learning", string>;
  activity: {
    title: string;
    viewAll: string;
    items: { title: string; time: string }[];
    weeklyFocus: string;
    weeklyFocusText: string;
  };
  projects: {
    title: string;
    subtitle: string;
    newProject: string;
    statuses: Record<"live" | "building" | "planning", string>;
  };
  markets: {
    title: string;
    live: string;
    demo: string;
    demoNote: string;
    updated: string;
    source: string;
    indicatorsHint: string;
    disclaimer: string;
    high: string;
    low: string;
    open: string;
    highLabel: string;
    lowLabel: string;
    marketCap: string;
    pe: string;
    week52: string;
    valuationBy: string;
    peShort: string;
    pbShort: string;
    percentile: string;
    percentileTip: string;
    cheap: string;
    fair: string;
    rich: string;
    goldenCross: string;
    deathCross: string;
    rsiOverbought: string;
    rsiOversold: string;
    rsiNeutral: string;
    above: (label: string) => string;
    below: (label: string) => string;
    macdTip: string;
    noData: string;
    viewDetail: string;
    unlockAll: string;
    unlockHint: string;
    registerCta: string;
    upgradeCta: string;
  };
  detail: {
    backToDashboard: string;
    open: string;
    prevClose: string;
    high: string;
    low: string;
    volume: string;
    marketCap: string;
    pe: string;
    week52: string;
    exchangeTime: string;
    dailyKline: string;
    klineSubtitle: string;
    daily: string;
    noKline: string;
    techUnavailable: string;
    hoverHint: string;
    openC: string;
    highC: string;
    lowC: string;
    closeC: string;
    lockedTitle: string;
    lockedBody: string;
  };
  simulator: {
    title: string;
    subtitle: string;
    capital: string;
    range: string[];
    pickStocks: string;
    equalWeight: string;
    maxDrawdown: string;
    finalValue: string;
    totalReturn: string;
    benchmark: string;
    vsBenchmark: string;
    chartTitle: string;
    legendPortfolio: string;
    legendBenchmark: string;
    empty: string;
    weight: string;
    disclaimer: string;
    days: string;
    proRange: string;
    upgrade: string;
  };
  agent: {
    title: string;
    subtitle: string;
    open: string;
    placeholder: string;
    send: string;
    thinking: string;
    welcome: string;
    quick: string[];
    error: string;
    limitReached: string;
    upgrade: string;
    quota: (remaining: number, limit: number) => string;
  };
  user: {
    login: string;
    upgrade: string;
    logout: string;
    pro: string;
    free: string;
  };
};

const en: Dict = {
  nav: {
    overview: "Overview",
    markets: "Markets",
    cn: "A-Shares",
    asia: "Japan & Korea",
    investments: "Simulator",
    projects: "Projects",
    learning: "Learning",
  },
  boards: {
    cn: { title: "A-Shares", titleEn: "A股行情" },
    asia: { title: "Japan & Korea", titleEn: "日韩股市" },
  },
  settings: "Settings",
  backToSite: "Back to website",
  eyebrow: "Personal command center",
  greeting: "Good morning, GUI",
  stats: {
    portfolio: "Portfolio value",
    ai: "AI projects",
    learning: "Learning hours",
  },
  activity: {
    title: "Recent activity",
    viewAll: "View all",
    items: [
      { title: "Deployed Personal Website", time: "2 hours ago" },
      { title: "Completed AI Agents course", time: "Yesterday" },
      { title: "Portfolio reached a new high", time: "3 days ago" },
    ],
    weeklyFocus: "Weekly focus",
    weeklyFocusText: "Ship the first working version of Research Copilot.",
  },
  projects: {
    title: "Active projects",
    subtitle: "A quick look at what you are building",
    newProject: "+ New project",
    statuses: {
      live: "Live",
      building: "Building",
      planning: "In progress",
    },
  },
  markets: {
    title: "U.S. Markets",
    live: "Live",
    demo: "Demo data",
    demoNote: "Live feed unavailable — showing the latest snapshot",
    updated: "Updated",
    source: "Data: Tencent quotes",
    indicatorsHint: "MA / RSI14 / MACD · click a card for details",
    disclaimer: "For reference only — not investment advice",
    high: "H",
    low: "L",
    open: "Open",
    highLabel: "High",
    lowLabel: "Low",
    marketCap: "Mkt cap",
    pe: "P/E",
    week52: "52W",
    valuationBy: "Valuation: Danjuan",
    peShort: "PE",
    pbShort: "PB",
    percentile: "Pctl",
    percentileTip: "Current P/E vs its own history; lower means cheaper",
    cheap: "Cheap",
    fair: "Fair",
    rich: "Rich",
    goldenCross: "Golden cross",
    deathCross: "Death cross",
    rsiOverbought: "Overbought",
    rsiOversold: "Oversold",
    rsiNeutral: "Neutral",
    above: (label: string) => `Price above ${label}`,
    below: (label: string) => `Price below ${label}`,
    macdTip: "MACD DIF",
    noData: "Market data temporarily unavailable — refresh to retry.",
    viewDetail: "View details",
    unlockAll: "Unlock all stocks",
    unlockHint: "Free plan shows 4 stocks per market",
    registerCta: "Sign up free to unlock more",
    upgradeCta: "Upgrade to Pro for all",
  },
  detail: {
    backToDashboard: "← Back to Dashboard",
    open: "Open",
    prevClose: "Prev close",
    high: "High",
    low: "Low",
    volume: "Volume",
    marketCap: "Market cap",
    pe: "P/E",
    week52: "52W range",
    exchangeTime: "Exchange time",
    dailyKline: "Daily K-line",
    klineSubtitle: "Last 60 sessions · MA5 / MA10 / MA20 · hover for daily data",
    daily: "Daily",
    noKline: "No K-line data (feed unavailable)",
    techUnavailable: "Technical indicators unavailable",
    hoverHint: "Hover for daily data",
    openC: "O",
    highC: "H",
    lowC: "L",
    closeC: "C",
    lockedTitle: "This instrument is locked",
    lockedBody: "Free plan includes 4 stocks per market. Upgrade to Pro to unlock all.",
  },
  simulator: {
    title: "Investment Simulator",
    subtitle: "Backtest your picks and allocation on historical daily data",
    capital: "Starting capital",
    range: ["1M", "3M", "6M", "1Y"],
    pickStocks: "Pick stocks",
    equalWeight: "Equal weight",
    maxDrawdown: "Max drawdown",
    finalValue: "Final value",
    totalReturn: "Total return",
    benchmark: "Benchmark",
    vsBenchmark: "vs S&P 500",
    chartTitle: "Simulated equity curve",
    legendPortfolio: "Portfolio",
    legendBenchmark: "S&P 500",
    empty: "Pick at least one stock",
    weight: "Weight",
    disclaimer: "Simulation is for learning purposes only — not investment advice.",
    days: "trading days",
    proRange: "6M / 1Y backtests are a Pro feature",
    upgrade: "Upgrade to Pro",
  },
  agent: {
    title: "AI Market Assistant",
    subtitle: "Built on live market data",
    open: "AI Assistant",
    placeholder: "Ask about markets, stocks, indicators…",
    send: "Send",
    thinking: "Analyzing…",
    welcome: "Hi! I'm the built-in market assistant. Try asking:",
    quick: ["Market overview", "AAPL", "RSI scan", "Nasdaq 100 valuation"],
    error: "Request failed, please try again.",
    limitReached: "Free plan includes 5 questions per day. Upgrade to Pro for a higher limit.",
    upgrade: "Upgrade to Pro",
    quota: (remaining: number, limit: number) => `${remaining}/${limit} questions left today`,
  },
  user: {
    login: "Log in",
    upgrade: "Upgrade to Pro",
    logout: "Log out",
    pro: "PRO",
    free: "FREE",
  },
};

export const dict: Record<Lang, Dict> = { zh, en };
