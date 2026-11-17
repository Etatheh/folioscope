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
    learning: "学习",
  },
  boards: {
    cn: { title: "A股行情", titleEn: "A-Shares" },
    asia: { title: "日韩股市", titleEn: "Japan & Korea" },
  },  settings: "设置",
  backToSite: "返回网站",
  eyebrow: "个人指挥中心",
  greeting: "早上好",
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
    cnNoticeTitle: "A股行情仅支持中文界面",
    cnNoticeBody: "英文版不展示 A 股板块，切换到中文即可查看。",
    switchToChinese: "切换到中文",
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
  assistant: {
    open: "AI 助手",
    title: "indepth AI",
    live: "Live Context",
    synced: "已同步当前页面行情",
    contextLabel: "当前页面上下文",
    welcome:
      "你好，我是 indepth AI。我会结合当前页面的美股指数、估值与定投数据，给出结构化的行情与资产配置分析。",
    quick: ["解读今日美股盘面", "分析当前定投回测方案", "标普500与纳指100配置建议"],
    placeholder: "问行情、估值、定投或资产配置…",
    send: "发送",
    thinking: "分析中…",
    newChat: "新对话",
    close: "关闭",
    stop: "停止",
    error: "请求失败，请稍后重试。",
    loginRequired: "请先登录再开始对话。",
    quota: (remaining: number, limit: number) => `今日剩余 ${remaining}/${limit} 次`,
    disclaimer: "AI 可能出错，行情与回测数据仅供参考，不构成投资建议。",
  },
  account: {
    title: "账号管理",
    subtitle: "管理个人资料、套餐额度与账号安全。",
    profile: "个人资料",
    avatarHint: "头像来自 Google 账号",
    email: "邮箱",
    emailManaged: "邮箱由登录服务商管理，不可修改",
    nickname: "昵称",
    nicknamePlaceholder: "输入昵称",
    nicknameHint: "2–32 个字符，将显示在顶部导航与 AI 助手中。",
    save: "保存修改",
    saving: "保存中…",
    saved: "资料已更新",
    plan: "套餐与额度",
    currentPlan: "当前套餐",
    aiCredits: "AI Assistant 剩余次数",
    unlimited: "不限次数",
    upgrade: "升级 Pro",
    proActive: "PRO 已激活",
    danger: "危险区域",
    dangerHint:
      "删除账号后，您的个人资料、套餐与所有数据将被永久删除，且无法恢复。",
    delete: "删除账号",
    confirmTitle: "确认删除账号",
    confirmHint: "此操作不可撤销。请输入 DELETE 以激活删除按钮。",
    confirmPlaceholder: "DELETE",
    cancel: "取消",
    confirmDelete: "永久删除账号",
    deleting: "删除中…",
    deletedToast: "账号及所有数据已永久删除",
    errorProfile: "资料保存失败，请稍后重试。",
    errorDelete: "删除失败，请稍后重试。",
    errorSupabase: "此操作需要 Supabase 登录。请先通过 Google 或邮箱登录。",
    errorNickname: "昵称长度需为 2–32 个字符。",
    close: "关闭",
  },
  user: {
    login: "登录",
    upgrade: "升级 Pro",
    logout: "退出登录",
    pro: "PRO 会员",
    free: "免费版",
    planFree: "FREE",
    planPro: "PRO",
    accountPlan: "账号管理",
    signOut: "退出登录",
    menuLabel: "账户菜单",
  },
  auth: {
    loginTitle: "欢迎回来",
    loginSubtitle: "登录后解锁完整行情、回测与 AI 分析。",
    signupTitle: "创建免费账号",
    signupSubtitle: "免费开始，无需信用卡。",
    google: "使用 Google 账号继续",
    microsoft: "使用 Microsoft 账号继续",
    comingSoon: "即将支持",
    microsoftSoon: "Microsoft 登录即将上线，请先使用 Google 或邮箱登录。",
    orEmail: "或使用邮箱登录",
    orEmailSignup: "或使用邮箱注册",
    email: "邮箱",
    emailPlaceholder: "you@example.com",
    password: "密码",
    passwordPlaceholder: "至少 6 位字符",
    loginCta: "登录",
    signupCta: "免费注册",
    loginBusy: "登录中…",
    signupBusy: "创建中…",
    noAccount: "还没有账号？",
    haveAccount: "已有账号？",
    toSignup: "免费注册",
    toLogin: "直接登录",
    confirmEmail: "注册成功，请查收验证邮件完成验证后再登录。",
    legalBack: "返回登录",
    legalUpdated: "最后更新",
    close: "关闭",
    legal: {
      pre: "继续即表示您同意我们的",
      terms: "《服务条款》",
      between1: "",
      privacy: "《隐私政策》",
      between2: "及",
      disclaimer: "《金融免责声明》",
      post: "。",
    },
    errors: {
      invalidEmail: "请输入有效的邮箱地址。",
      invalidCredentials: "邮箱或密码不正确。",
      emailTaken: "该邮箱已注册，请直接登录。",
      weakPassword: "密码至少需要 6 位字符。",
      emailNotConfirmed: "请先完成邮箱验证再登录。",
      rateLimited: "尝试次数过多，请稍后再试。",
      notConfigured: "登录服务尚未配置，请稍后再试。",
      oauth: "第三方登录启动失败，请改用邮箱登录。",
      network: "网络异常，请稍后重试。",
      generic: "操作失败，请稍后再试。",
    },
  },
  watchlist: {
    title: "自选与精选",
    subtitle: "14 只核心标的免费收藏 · Pro 解锁全美股搜索",
    tabFeatured: "热门精选",
    tabMine: "我的自选",
    featuredNote: "免费精选 · 14 只核心标的",
    mineNote: "已云端同步",
    count: (n: number) => `${n} 只`,
    emptyTitle: "自选股还是空的",
    emptyBody: "点击任意股票卡片右上角的 ♡，登录后即可跨设备云端同步。",
    loginTitle: "登录后同步自选股",
    loginBody: "收藏会保存到 Supabase，并在所有设备保持同步。",
    loginCta: "登录 / 注册",
    add: "加入自选",
    added: "已收藏",
    remove: "取消收藏",
    savedToast: (symbol: string) => `${symbol} 已加入自选`,
    removedToast: (symbol: string) => `${symbol} 已移出自选`,
    errorToast: "自选同步失败，请稍后重试",
    searchPlaceholder: "搜索美股 / ETF 代码…",
    searchHint: "试试 NVDA、SPY、BRK.B",
    searchAria: "搜索美股代码",
    searching: "正在获取报价…",
    noResult: "未找到该标的，请检查代码后重试。",
    searchError: "行情接口暂不可用，请稍后再试。",
    proLocked: "Pro 专属",
    proLockedTitle: "该标的仅对 Pro 开放",
    proLockedBody: "免费版可查看 14 只精选标的；升级 Pro 解锁全美股与 ETF 搜索。",
    upgrade: "升级 Pro",
    searchResult: "搜索结果",
    addWatchlist: "加入自选",
    syncBacktest: "同步到回测池",
    syncing: "正在同步…",
    syncedToast: (symbol: string) => `${symbol} 已同步到回测标的池`,
    syncFailed: "该标的暂时无法加入回测池",
    viewDetail: "查看详情",
    priceLocked: "价格已锁定",
    proSearchBadge: "PRO SEARCH",
    navTitle: "我的自选",
    navEmpty: "还没有收藏的股票",
    navLogin: "登录后开启云端自选",
    navViewAll: "查看全部自选",
    navCount: (n: number) => `${n} 只`,
    guests: "登录后可收藏",
    localOnly: "本地缓存",
  },
  pro: {
    feature: "PRO FEATURE",
    badgeTip: "Pro 专属功能",
    upgrade: "升级 Pro",
    active: "Pro 已激活",
    modal: {
      title: "升级到 Pro",
      subtitle: "解锁 5 年定投回测、每日 AI 摘要与更高的 AI 额度。",
      price: "$9",
      period: "/ 月",
      cancel: "随时可取消 · 通过 Lemon Squeezy 安全结算",
      compare: "权益对比",
      feature: "功能",
      free: "免费版",
      pro: "Pro",
      rows: [
        { label: "每个市场可看股票", free: "4 只", pro: "全部" },
        { label: "定投回测周期", free: "1 个月", pro: "5 年" },
        { label: "AI 市场摘要", free: "—", pro: "每日生成" },
        { label: "AI 助手额度", free: "5 次/天", pro: "200 次/天" },
        { label: "云端自选股", free: "14 只精选", pro: "全市场" },
      ],
      cta: "使用 Lemon Squeezy 升级",
      ctaBusy: "正在前往结算…",
      ctaDemo: "立即开通 Pro（演示）",
      demo: "支付通道尚未接入：当前点击会以演示方式立即开通 Pro。",
      demoBusy: "正在开通…",
      login: "请先登录再升级",
      done: "已开通 Pro ✓",
      error: "升级失败，请稍后再试。",
      close: "关闭",
    },
  },
  aiSummary: {
    title: "AI 市场摘要",
    subtitle: "基于实时指数与个股数据，每日一段话",
    generate: "生成摘要",
    regenerate: "重新生成",
    loading: "正在生成摘要…",
    empty: "点击「生成摘要」，用几句话看懂今天的市场。",
    locked: "AI 摘要为 Pro 功能：升级后每天自动生成市场简报。",
    lockedPreview:
      "三大指数整体收涨，科技与半导体板块领涨，资金继续流向成长股；能源板块受油价回落拖累，防御性板块表现平淡。",
    updated: "生成于",
    error: "生成失败，请稍后重试。",
    quota: (remaining: number, limit: number) => `今日剩余 ${remaining}/${limit} 次`,
    prompt:
      "请用不超过 120 字的中文总结当前美股主要指数的涨跌、领涨与领跌板块，不要给投资建议。",
  },
  stockReport: {
    button: "AI 财报分析",
    badge: "PRO",
    title: "AI 个股财报深度分析",
    subtitle: "Yahoo Finance 财报数据 · DeepSeek 中英双语研报",
    loading: "正在抓取最新财报并生成研报…",
    cached: "24 小时缓存",
    generated: "生成于",
    dataAsOf: "数据时间",
    error: "研报生成失败，请稍后重试。",
    unauthorized: "请先登录后再查看 AI 财报分析。",
    upgradeTitle: "AI 财报分析为 Pro 专属",
    upgradeBody: "升级 Pro 解锁每只股票的财报亮点、估值水位与风险提示。",
    upgradeCta: "升级 Pro",
    retry: "重试",
    close: "关闭",
    sections: {
      summary: "核心结论",
      highlights: "核心财务亮点",
      valuation: "估值水位",
      risks: "潜在风险",
      verdict: "综合评述",
    },
    metrics: {
      revenueGrowth: "营收增速",
      grossMargin: "毛利率",
      freeCashflow: "自由现金流",
      pe: "市盈率 PE",
      pb: "市净率 PB",
      week52: "52 周区间",
      price: "最新价",
      marketCap: "总市值",
    },
    epsTitle: "近 4 季 EPS：实际 vs 预期",
    actual: "实际",
    estimate: "预期",
    surprise: "超预期",
    noEps: "暂无 EPS 对比数据",
    disclaimer: "AI 生成内容基于 Yahoo Finance 公开财报数据，仅供参考，不构成投资建议。",
    langZh: "中文",
    langEn: "EN",
  },
  dca: {
    title: "定投回测",
    subtitle: "标普 500 · 每月定投 · 长期复利测算",
    monthly: "每月定投",
    invested: "累计投入",
    finalValue: "期末市值",
    totalReturn: "总收益",
    xirr: "资金加权年化（XIRR）",
    xirrNote: "（不足1年年化参考）",
    periods: { m6: "6个月", y1: "1年", y3: "3年", y5: "5年", y10: "10年" },
    tip: { month: "月份", invested: "累计本金", value: "当期市值", profit: "复利净赚", benchmark: "标普500 一次性" },
    legend: { dca: "定投市值", principal: "累计本金", benchmark: "标普500 一次性" },
    target: "定投标的",
    months: "个月",
    asOf: "截至",
    stale: "缓存数据",
    unavailable: "数据不可用",
    unavailableTitle: "暂时无法生成回测",
    unavailableBody: "需要完整的 60 个月历史收盘价。数据恢复后将自动生成真实回测结果。",
    locked: "5 年定投回测为 Pro 功能，升级后可调整金额并查看完整曲线。",
    assumptions: "每月最后一个交易日收盘后买入 · 可买碎股 · 零手续费 · 美元计价",
    disclaimer: "回测使用历史日线收盘价，不含股息、税费和滑点，仅供参考，不构成投资建议。",
  },
};

type Dict = {
  nav: Record<"overview" | "markets" | "cn" | "asia" | "investments" | "learning", string>;
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
    cnNoticeTitle: string;
    cnNoticeBody: string;
    switchToChinese: string;
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
  assistant: {
    open: string;
    title: string;
    live: string;
    synced: string;
    contextLabel: string;
    welcome: string;
    quick: string[];
    placeholder: string;
    send: string;
    thinking: string;
    newChat: string;
    close: string;
    stop: string;
    error: string;
    loginRequired: string;
    quota: (remaining: number, limit: number) => string;
    disclaimer: string;
  };
  account: {
    title: string;
    subtitle: string;
    profile: string;
    avatarHint: string;
    email: string;
    emailManaged: string;
    nickname: string;
    nicknamePlaceholder: string;
    nicknameHint: string;
    save: string;
    saving: string;
    saved: string;
    plan: string;
    currentPlan: string;
    aiCredits: string;
    unlimited: string;
    upgrade: string;
    proActive: string;
    danger: string;
    dangerHint: string;
    delete: string;
    confirmTitle: string;
    confirmHint: string;
    confirmPlaceholder: string;
    cancel: string;
    confirmDelete: string;
    deleting: string;
    deletedToast: string;
    errorProfile: string;
    errorDelete: string;
    errorSupabase: string;
    errorNickname: string;
    close: string;
  };
  user: {
    login: string;
    upgrade: string;
    logout: string;
    pro: string;
    free: string;
    planFree: string;
    planPro: string;
    accountPlan: string;
    signOut: string;
    menuLabel: string;
  };
  auth: {
    loginTitle: string;
    loginSubtitle: string;
    signupTitle: string;
    signupSubtitle: string;
    google: string;
    microsoft: string;
    comingSoon: string;
    microsoftSoon: string;
    orEmail: string;
    orEmailSignup: string;
    email: string;
    emailPlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    loginCta: string;
    signupCta: string;
    loginBusy: string;
    signupBusy: string;
    noAccount: string;
    haveAccount: string;
    toSignup: string;
    toLogin: string;
    confirmEmail: string;
    legalBack: string;
    legalUpdated: string;
    close: string;
    legal: {
      pre: string;
      terms: string;
      between1: string;
      privacy: string;
      between2: string;
      disclaimer: string;
      post: string;
    };
    errors: {
      invalidEmail: string;
      invalidCredentials: string;
      emailTaken: string;
      weakPassword: string;
      emailNotConfirmed: string;
      rateLimited: string;
      notConfigured: string;
      oauth: string;
      network: string;
      generic: string;
    };
  };
  watchlist: {
    title: string;
    subtitle: string;
    tabFeatured: string;
    tabMine: string;
    featuredNote: string;
    mineNote: string;
    count: (n: number) => string;
    emptyTitle: string;
    emptyBody: string;
    loginTitle: string;
    loginBody: string;
    loginCta: string;
    add: string;
    added: string;
    remove: string;
    savedToast: (symbol: string) => string;
    removedToast: (symbol: string) => string;
    errorToast: string;
    searchPlaceholder: string;
    searchHint: string;
    searchAria: string;
    searching: string;
    noResult: string;
    searchError: string;
    proLocked: string;
    proLockedTitle: string;
    proLockedBody: string;
    upgrade: string;
    searchResult: string;
    addWatchlist: string;
    syncBacktest: string;
    syncing: string;
    syncedToast: (symbol: string) => string;
    syncFailed: string;
    viewDetail: string;
    priceLocked: string;
    proSearchBadge: string;
    navTitle: string;
    navEmpty: string;
    navLogin: string;
    navViewAll: string;
    navCount: (n: number) => string;
    guests: string;
    localOnly: string;
  };
  pro: {
    feature: string;
    badgeTip: string;
    upgrade: string;
    active: string;
    modal: {
      title: string;
      subtitle: string;
      price: string;
      period: string;
      cancel: string;
      compare: string;
      feature: string;
      free: string;
      pro: string;
      rows: { label: string; free: string; pro: string }[];
      cta: string;
      ctaBusy: string;
      ctaDemo: string;
      demo: string;
      demoBusy: string;
      login: string;
      done: string;
      error: string;
      close: string;
    };
  };
  aiSummary: {
    title: string;
    subtitle: string;
    generate: string;
    regenerate: string;
    loading: string;
    empty: string;
    locked: string;
    lockedPreview: string;
    updated: string;
    error: string;
    quota: (remaining: number, limit: number) => string;
    prompt: string;
  };
  stockReport: {
    button: string;
    badge: string;
    title: string;
    subtitle: string;
    loading: string;
    cached: string;
    generated: string;
    dataAsOf: string;
    error: string;
    unauthorized: string;
    upgradeTitle: string;
    upgradeBody: string;
    upgradeCta: string;
    retry: string;
    close: string;
    sections: {
      summary: string;
      highlights: string;
      valuation: string;
      risks: string;
      verdict: string;
    };
    metrics: {
      revenueGrowth: string;
      grossMargin: string;
      freeCashflow: string;
      pe: string;
      pb: string;
      week52: string;
      price: string;
      marketCap: string;
    };
    epsTitle: string;
    actual: string;
    estimate: string;
    surprise: string;
    noEps: string;
    disclaimer: string;
    langZh: string;
    langEn: string;
  };
  dca: {
    title: string;
    subtitle: string;
    monthly: string;
    invested: string;
    finalValue: string;
    totalReturn: string;
    xirr: string;
    xirrNote: string;
    periods: { m6: string; y1: string; y3: string; y5: string; y10: string };
    tip: { month: string; invested: string; value: string; profit: string; benchmark: string };
    legend: { dca: string; principal: string; benchmark: string };
    target: string;
    months: string;
    asOf: string;
    stale: string;
    unavailable: string;
    unavailableTitle: string;
    unavailableBody: string;
    locked: string;
    assumptions: string;
    disclaimer: string;
  };
};

const en: Dict = {
  nav: {
    overview: "Overview",
    markets: "Markets",
    cn: "A-Shares",
    asia: "Japan & Korea",
    investments: "Simulator",
    learning: "Learning",
  },
  boards: {
    cn: { title: "A-Shares", titleEn: "A股行情" },
    asia: { title: "Japan & Korea", titleEn: "日韩股市" },
  },
  settings: "Settings",
  backToSite: "Back to website",
  eyebrow: "Personal command center",
  greeting: "Good morning",
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
    cnNoticeTitle: "A-shares are available in the Chinese version",
    cnNoticeBody: "The English site focuses on US markets. Switch to Chinese to see the A-share board.",
    switchToChinese: "Switch to Chinese",
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
  assistant: {
    open: "AI Assistant",
    title: "indepth AI",
    live: "Live Context",
    synced: "Synced with the current page",
    contextLabel: "Current page context",
    welcome:
      "Hi, I'm indepth AI. I combine the live US indices, valuations and DCA figures on this page to give you structured market and allocation analysis.",
    quick: [
      "Explain today's US market",
      "Review the current DCA plan",
      "S&P 500 vs Nasdaq 100 allocation",
    ],
    placeholder: "Ask about markets, valuations, DCA or allocation…",
    send: "Send",
    thinking: "Analyzing…",
    newChat: "New chat",
    close: "Close",
    stop: "Stop",
    error: "Request failed. Please try again.",
    loginRequired: "Please log in to start chatting.",
    quota: (remaining: number, limit: number) => `${remaining}/${limit} questions left today`,
    disclaimer:
      "AI can make mistakes. Market and backtest data are for reference only — not investment advice.",
  },
  account: {
    title: "Account Settings",
    subtitle: "Manage your profile, plan credits and account security.",
    profile: "Profile",
    avatarHint: "Avatar from your Google account",
    email: "Email",
    emailManaged: "Managed by your sign-in provider and read-only",
    nickname: "Display name",
    nicknamePlaceholder: "Enter a display name",
    nicknameHint: "2–32 characters, shown in the header and assistant.",
    save: "Save changes",
    saving: "Saving…",
    saved: "Profile updated",
    plan: "Plan & AI Credits",
    currentPlan: "Current plan",
    aiCredits: "AI Assistant credits",
    unlimited: "Unlimited",
    upgrade: "Upgrade to Pro",
    proActive: "PRO active",
    danger: "Danger Zone",
    dangerHint:
      "Deleting your account permanently removes your profile, plan and all data. This cannot be undone.",
    delete: "Delete Account",
    confirmTitle: "Confirm account deletion",
    confirmHint:
      "This action cannot be undone. Type DELETE to enable the deletion button.",
    confirmPlaceholder: "DELETE",
    cancel: "Cancel",
    confirmDelete: "Permanently delete account",
    deleting: "Deleting…",
    deletedToast: "Account and all data have been permanently deleted",
    errorProfile: "Could not save your profile. Please try again.",
    errorDelete: "Could not delete the account. Please try again.",
    errorSupabase:
      "This action requires a Supabase session. Sign in with Google or email first.",
    errorNickname: "Display name must be 2–32 characters.",
    close: "Close",
  },
  user: {
    login: "Log in",
    upgrade: "Upgrade to Pro",
    logout: "Log out",
    pro: "PRO",
    free: "FREE",
    planFree: "FREE",
    planPro: "PRO",
    accountPlan: "Account Settings",
    signOut: "Sign out",
    menuLabel: "Account menu",
  },
  auth: {
    loginTitle: "Welcome back",
    loginSubtitle: "Sign in to unlock full market data, backtests and AI analysis.",
    signupTitle: "Create a free account",
    signupSubtitle: "Start free. No credit card required.",
    google: "Continue with Google",
    microsoft: "Continue with Microsoft",
    comingSoon: "Coming soon",
    microsoftSoon: "Microsoft sign-in is coming soon. Please use Google or email for now.",
    orEmail: "or continue with email",
    orEmailSignup: "or sign up with email",
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Password",
    passwordPlaceholder: "At least 6 characters",
    loginCta: "Log in",
    signupCta: "Create free account",
    loginBusy: "Signing in…",
    signupBusy: "Creating account…",
    noAccount: "New to Markets?",
    haveAccount: "Already have an account?",
    toSignup: "Create an account",
    toLogin: "Log in",
    confirmEmail: "Account created. Check your inbox to confirm your email, then log in.",
    legalBack: "Back to sign in",
    legalUpdated: "Last updated",
    close: "Close",
    legal: {
      pre: "By continuing, you agree to our ",
      terms: "Terms of Service",
      between1: ", ",
      privacy: "Privacy Policy",
      between2: ", and ",
      disclaimer: "Financial Disclaimer",
      post: ".",
    },
    errors: {
      invalidEmail: "Please enter a valid email address.",
      invalidCredentials: "Incorrect email or password.",
      emailTaken: "This email is already registered. Please log in instead.",
      weakPassword: "Password must be at least 6 characters.",
      emailNotConfirmed: "Please confirm your email before logging in.",
      rateLimited: "Too many attempts. Please try again later.",
      notConfigured: "Sign-in is not configured yet. Please try again later.",
      oauth: "Could not start social sign-in. Please use email instead.",
      network: "Network error. Please try again.",
      generic: "Something went wrong. Please try again.",
    },
  },
  watchlist: {
    title: "Watchlist & Featured",
    subtitle: "14 core names free to save · Pro unlocks the whole U.S. market",
    tabFeatured: "Featured",
    tabMine: "My Watchlist",
    featuredNote: "Free curated pool · 14 core names",
    mineNote: "Synced to the cloud",
    count: (n: number) => `${n} saved`,
    emptyTitle: "Your watchlist is empty",
    emptyBody: "Tap the ♡ on any stock card to save it. Log in to sync across devices.",
    loginTitle: "Log in to sync your watchlist",
    loginBody: "Favorites are stored in Supabase and stay in sync everywhere.",
    loginCta: "Log in / Sign up",
    add: "Add to watchlist",
    added: "Saved",
    remove: "Remove from watchlist",
    savedToast: (symbol: string) => `${symbol} added to your watchlist`,
    removedToast: (symbol: string) => `${symbol} removed from your watchlist`,
    errorToast: "Could not sync your watchlist. Please try again.",
    searchPlaceholder: "Search U.S. Market…",
    searchHint: "Try NVDA, SPY or BRK.B",
    searchAria: "Search U.S. ticker",
    searching: "Fetching quote…",
    noResult: "No match for that ticker. Check the symbol and retry.",
    searchError: "Quote feed unavailable. Please try again shortly.",
    proLocked: "Pro only",
    proLockedTitle: "This symbol is Pro-only",
    proLockedBody: "Free includes 14 curated names. Upgrade to Pro to search every U.S. stock and ETF.",
    upgrade: "Upgrade to Pro",
    searchResult: "Search result",
    addWatchlist: "Add to watchlist",
    syncBacktest: "Sync to backtest",
    syncing: "Syncing…",
    syncedToast: (symbol: string) => `${symbol} synced to the backtest pool`,
    syncFailed: "This symbol could not be added to the backtest pool",
    viewDetail: "View details",
    priceLocked: "Price locked",
    proSearchBadge: "PRO SEARCH",
    navTitle: "My Watchlist",
    navEmpty: "No saved stocks yet",
    navLogin: "Log in to start a cloud watchlist",
    navViewAll: "View all favorites",
    navCount: (n: number) => `${n} saved`,
    guests: "Log in to save",
    localOnly: "Local cache",
  },
  pro: {
    feature: "PRO FEATURE",
    badgeTip: "Pro feature",
    upgrade: "Upgrade to Pro",
    active: "Pro active",
    modal: {
      title: "Upgrade to Pro",
      subtitle:
        "Unlock the 5-year DCA backtest, a daily AI summary and a larger AI budget.",
      price: "$9",
      period: "/ month",
      cancel: "Cancel anytime · secure checkout by Lemon Squeezy",
      compare: "What you get",
      feature: "Feature",
      free: "Free",
      pro: "Pro",
      rows: [
        { label: "Stocks per market", free: "4", pro: "All" },
        { label: "DCA backtest range", free: "1 month", pro: "5 years" },
        { label: "AI market summary", free: "—", pro: "Daily" },
        { label: "AI assistant quota", free: "5 / day", pro: "200 / day" },
        { label: "Cloud watchlist", free: "14 names", pro: "Whole market" },
      ],
      cta: "Continue with Lemon Squeezy",
      ctaBusy: "Opening checkout…",
      ctaDemo: "Activate Pro now (demo)",
      demo: "Billing is not connected yet — this button activates Pro in demo mode.",
      demoBusy: "Activating…",
      login: "Log in first to upgrade",
      done: "Pro activated ✓",
      error: "Upgrade failed. Please try again.",
      close: "Close",
    },
  },
  aiSummary: {
    title: "AI Market Summary",
    subtitle: "One paragraph a day, built from live index and stock data",
    generate: "Generate summary",
    regenerate: "Regenerate",
    loading: "Writing the summary…",
    empty: "Hit “Generate summary” for a short read on today's market.",
    locked: "The AI summary is a Pro feature — upgrade to get a daily briefing.",
    lockedPreview:
      "All three major indices closed higher, led by technology and semiconductors as flows kept moving into growth; energy lagged on softer crude, while defensives stayed flat.",
    updated: "Generated",
    error: "Could not generate the summary. Please try again.",
    quota: (remaining: number, limit: number) => `${remaining}/${limit} questions left today`,
    prompt:
      "Summarize today's U.S. index moves and the leading/lagging sectors in under 100 words. No investment advice.",
  },
  stockReport: {
    button: "AI Earnings Analysis",
    badge: "PRO",
    title: "AI Fundamental Earnings Report",
    subtitle: "Yahoo Finance fundamentals · bilingual DeepSeek research",
    loading: "Fetching the latest fundamentals and drafting the report…",
    cached: "24h cache",
    generated: "Generated",
    dataAsOf: "Data as of",
    error: "Could not generate the report. Please try again.",
    unauthorized: "Please log in to view the AI earnings report.",
    upgradeTitle: "AI earnings analysis is a Pro feature",
    upgradeBody:
      "Upgrade to Pro to unlock financial highlights, valuation context and risk flags for every stock.",
    upgradeCta: "Upgrade to Pro",
    retry: "Retry",
    close: "Close",
    sections: {
      summary: "Key takeaway",
      highlights: "Financial highlights",
      valuation: "Valuation",
      risks: "Risks",
      verdict: "Balanced view",
    },
    metrics: {
      revenueGrowth: "Revenue growth",
      grossMargin: "Gross margin",
      freeCashflow: "Free cash flow",
      pe: "P/E",
      pb: "P/B",
      week52: "52-week range",
      price: "Last price",
      marketCap: "Market cap",
    },
    epsTitle: "Last 4 quarters: EPS actual vs estimate",
    actual: "Actual",
    estimate: "Estimate",
    surprise: "Surprise",
    noEps: "No EPS comparison data",
    disclaimer:
      "AI-generated content based on public Yahoo Finance fundamentals. For reference only — not investment advice.",
    langZh: "中文",
    langEn: "EN",
  },
  dca: {
    title: "DCA Backtest",
    subtitle: "S&P 500 · monthly contributions · long-horizon compounding",
    monthly: "Monthly contribution",
    invested: "Total invested",
    finalValue: "Final value",
    totalReturn: "Total return",
    xirr: "Money-weighted annual return (XIRR)",
    xirrNote: "(<1y annualized reference)",
    periods: { m6: "6M", y1: "1Y", y3: "3Y", y5: "5Y", y10: "10Y" },
    tip: { month: "Month", invested: "Invested", value: "Value", profit: "Compound gain", benchmark: "Lump-sum S&P 500" },
    legend: { dca: "DCA value", principal: "Invested", benchmark: "Lump-sum S&P 500" },
    target: "DCA into",
    months: "months",
    asOf: "As of",
    stale: "Cached data",
    unavailable: "Data unavailable",
    unavailableTitle: "Backtest temporarily unavailable",
    unavailableBody: "A full 60 months of historical closes is required before results are shown.",
    locked: "The 5-year DCA backtest is a Pro feature — upgrade to tune the amount and see the full curve.",
    assumptions: "Buy at the close of the last trading day each month · fractional shares · zero fees · USD",
    disclaimer:
      "Backtest uses historical daily closes and excludes dividends, taxes, and slippage. For reference only — not investment advice.",
  },
};

export const dict: Record<Lang, Dict> = { zh, en };
