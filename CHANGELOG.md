# CHANGELOG — 版本变更交接日志

> 供后续 AI 与人类快速交接。**倒序时间线**：最新记录写在最上面。
> 每条记录固定包含 4 项：① 日期与版本主题 ② 核心改动内容 ③ 涉及的核心文件路径 ④ 架构与设计约定（Do Not Break）。
> 约定：不要修改或删除历史条目，新变更只在顶部新增记录。历史细节原存于 `docs/changes/*.md`，已合并进本文件。

---

## 2026-11-18 - 支付成功回跳 dashboard 并自动激活 Pro（fix / billing）

1. **日期与版本主题**：2026-11-18 — 修复 Creem 结账成功后的回跳体验：付款完成直接回到 dashboard，并在 webhook 稍晚到达时自动轮询激活 Pro，而不是停在首页且仍显示 Free。
2. **核心改动内容**：
   - `app/api/checkout/route.ts`：`success_url` 由 `/?checkout=success` 改为 `/dashboard?checkout=success`。
   - 新增 `components/CheckoutReturn.tsx`：检测 `?checkout=success`，提示 `Payment successful — activating your Pro plan…`，随后每 1.5s 轮询 `GET /api/auth/me`（最多 10 次）；一旦 `tier` 为 `pro`/`admin` 就执行 `window.location.replace("/dashboard")` 整页刷新，使 `use-session` 的模块级 store 重新读取到 Pro；轮询超时则提示 webhook 仍在处理。进入时用 `history.replaceState` 清掉参数，避免刷新重放。
   - `app/layout.tsx`：在 `<ToastHost />` 之后挂载 `<CheckoutReturn />`（不渲染任何 DOM，不改变布局）。
3. **涉及的核心文件路径**：`components/CheckoutReturn.tsx`（新增）、`app/layout.tsx`、`app/api/checkout/route.ts`、`CHANGELOG.md`。
4. **架构与设计约定（Do Not Break）**：
   - 必须用整页跳转（`window.location.replace`），不能用 `router.push`：`lib/use-session.ts` 的 session store 每个文档只初始化一次，客户端路由不会重新拉取 tier。
   - `CheckoutReturn` 必须挂在 `<ToastHost />` 之后，否则首个 toast 会早于监听器注册而丢失。
   - 不改动 dashboard / 主页面布局、K 线图表与全局 CSS。
   - **验证结果**：`npx tsc --noEmit`、ESLint 通过，`NEXT_DIST_DIR=.next/build-check next build --webpack` 构建成功。

---

## 2026-11-18 - Upgrade Pro 新增暗色套餐对比弹窗 PricingModal（feat / ui）

1. **日期与版本主题**：2026-11-18 — 在跳转 Creem 支付前新增暗色金融终端风格的 Free vs Pro 双栏对比弹窗（含月付／年付切换）作为确认缓冲页；升级入口改为「先弹窗、再支付」并统一视觉。
2. **核心改动内容**：
   - 新增 `components/ui/PricingModal.tsx`：桌面左右双栏、移动端上下堆叠。左卡 Free（$0 / month，副标题 `For exploring market data`，3 项权益，底部灰态不可点击 `Current Plan`）；右卡 FolioScope Pro（$9 / month，紫色高亮边框 + 右上角 `PRO` 徽章，副标题 `Full institutional-grade research & AI tools`，5 项权益，白色高对比主按钮 `Continue to Checkout →`，下方小字 `Secured by Creem · Cancel anytime`）。
   - 视觉：`bg-zinc-950` 纯黑底、`border-white/10` 细边框、顶部 hairline 微光、紫／蓝柔光晕、半透明毛玻璃遮罩（`bg-black/70` + `backdrop-blur-md`）；只用 Tailwind 类与内联样式，未新增全局 CSS。
   - **月付／年付切换**：Pro 卡片内新增分段开关 `Monthly · $9/mo` / `Yearly · $79/yr · Save 34%`，主价格随之在 `$9 / month` 与 `$79 / year` 之间切换；仅当 `GET /api/checkout` 返回 `yearly: true` 时才渲染，年付不可用时用派生值 `effectiveCycle` 自动回落月付（不在 effect 内 setState）。
   - 交互：点击 `Continue to Checkout` 才调用既有 `POST /api/checkout`（`billingCycle` 取当前选中的周期）；请求期间按钮禁用并显示加载图标 + `Connecting to Checkout...`，拿到链接后跳转 Creem；接口报错在弹窗底部显示红色提示；401 带 `redirect` 跳登录页。支持遮罩点击、右上角 `×`、`Esc` 关闭，保留滚动锁与焦点陷阱。
   - `components/ui/ProUpgradeButton.tsx`：仅替换触发目标——未登录仍先弹登录框，已登录改为打开 `PricingModal`，不再直接请求支付接口。
   - `components/ui/UnlockCtaButton.tsx`（Unlock all stocks 磁贴）一并改走 `PricingModal`，保持升级入口视觉统一。
3. **涉及的核心文件路径**：`components/ui/PricingModal.tsx`（新增）、`components/ui/ProUpgradeButton.tsx`、`components/ui/UnlockCtaButton.tsx`、`CHANGELOG.md`。
4. **架构与设计约定（Do Not Break）**：
   - 未改动主页面、K 线图表（`components/PriceChart.tsx`）、侧边栏布局与 `app/globals.css`；不得为弹窗新增全局样式或改写 `.glass` / `.btn-primary` 等既有类。
   - `components/ui/UpgradeModal.tsx` 仍在使用中（`components/watchlist/MarketSearch.tsx`、`components/stock/StockReportButton.tsx`、`components/simulator/SimulatorWorkbench.tsx`），不要删除或改写；如需统一升级入口，应逐个替换引用后再评估删除。
   - `/pricing` 页面的 Monthly / Yearly 切换与年付能力保持原样；`PricingModal` 与其共用 `GET /api/checkout` 返回的 `monthly` / `yearly` 开关，两处都必须尊重后端配置，不得写死年付可用。
   - 年付不可用时必须回落到月付，且不得用 effect 内同步 setState 实现（ESLint `react-hooks/set-state-in-effect` 会报错），统一用派生值 `effectiveCycle`。
   - `prefers-reduced-motion` 降级必须保留：reduce 时加载图标不加 `animate-spin`，进出场动效退化为纯透明度。
   - 弹窗文案按 English-first 固定英文，不新增中文翻译键。
   - **验证结果**：`npx tsc --noEmit`、ESLint 通过，`NEXT_DIST_DIR=.next/build-check next build --webpack` 全路由构建成功。

---

## 2026-11-18 - FolioScope AI 流式渲染光效、主动诊断与模拟器上下文同步（feat / style）

1. **日期与版本主题**：2026-11-18 — 升级 FolioScope AI 抽屉的流式渲染手感与主动诊断体验，并把模拟器持仓／回测指标接入 Live Context。
2. **核心改动内容**：
   - **流式渲染**：token 通过 `requestAnimationFrame` 合并为每帧一次更新；新增气泡淡入、紫色文字柔光、行内脉冲紫色光标与块级淡入；自动滚动改为“粘底 + 用户上滑即停止”，并保留 `prefers-reduced-motion` 降级。
   - **主动诊断**：抽屉首次打开或点击 `↻` 时以 `mode: "diagnosis"` 立即生成少于 150 词的诊断，固定 **Key Takeaway / Risk / Concentration Check / Next Action** 三段，不再输出通用菜单；缺失或锁定数据必须明确说明。
   - **快捷指令**：输入框上方新增 3 个可横向滚动的一键胶囊（Cut Risk / Optimize Split / Compare Benchmarks）。
   - **上下文**：模拟器发布持仓、权重、模式、本金／初始投入／周期投入、Custom 区间与回测指标到 `ai-context-store`，抽屉优先使用该快照并避免与旧 DCA 默认方案混用。
   - **验证结果**：`npx tsc --noEmit`、`npx eslint components lib app`、`NEXT_DIST_DIR=.next/build-check npx next build` 全部通过；本地 `/dashboard?view=simulator` 返回 200；未登录诊断请求返回 401。
3. **涉及的核心文件路径**：`components/ai/AiAssistantDrawer.tsx`、`components/ai/MarkdownText.tsx`、`app/globals.css`、`app/api/chat/route.ts`、`lib/chat.ts`、`lib/ai-context-store.ts`、`components/simulator/SimulatorWorkbench.tsx`、`CHANGELOG.md`。
4. **架构与设计约定（Do Not Break）**：
   - `.ai-stream-in` / `.ai-block-in` / `.ai-stream-glow` 与 `prefers-reduced-motion` 降级必须保留；流式更新必须继续走 rAF 合并，避免逐 token 重渲染。
   - 诊断模式必须保持 `mode: "diagnosis"`、三段式少于 150 词契约，不得回退为欢迎菜单或示例问题列表。
   - 用户主动上滑后不得强制拉回底部；只有回到底部附近才恢复自动跟随。
   - 模拟器上下文必须来自真实 `result` 与当前 `selected`／`weights`，不得编造锁定或缺失指标；`setAiSimulator` 在卸载时必须清理。
   - 保留抽屉头部（Live Context、刷新、关闭）与底部免责声明。

---

## 2026-11-18 - 模拟器 Custom 区间、DCA 参数升级、本金基线与上市日期对齐（feat）

1. **日期与版本主题**：2026-11-18 — Investment Simulator 新增 Pro/Admin Custom 日期区间与历史剧本、完善 DCA 初始/周期投入与收益指标、增加累计本金阶梯线与共同上市日期对齐容错。
2. **核心改动内容**：
   - **Custom 区间**：`PeriodTabs` 末尾新增 `Custom`（免费用户显示 `✦ PRO`，点击打开 `UpgradeModal`；Pro/Admin 直接解锁）；展开暗黑日期栏，包含 `Start Date` / `End Date`，数据窗口扩至 3200 根日线（约 12 年，最早 2014-03），并保留 `2022 Tech Bear`、`COVID Crash`、`AI Bull Run` 三个历史剧本快捷按钮。
   - **DCA 参数**：新增 `Initial Deposit`（允许 $0）、`Recurring Amount`（默认 $500）与 `Weekly / Bi-weekly / Monthly` 频率胶囊；引擎按交易日周期买入，先投入初始本金，再按频率定投（有初始本金时首期定投从下一周期开始）。
   - **DCA 指标**：统计改为 `Total Invested`、`Final Value`、`Net Profit`（金额 + 总收益率 %）、`Max Drawdown`、`CAGR`；XIRR 现金流包含初始本金与每期定投。
   - **本金基线**：DCA 图表同时绘制绿色组合总资产、灰色虚线 S&P 500 镜像（相同现金流）与淡紫 `#c4b5fd` 阶梯虚线累计本金；图例与悬停 HUD 显示 `Portfolio Value / S&P 500 / Principal / P/L` 与 Alpha；Y 轴保持真实美元刻度。
   - **上市日期对齐**：实际回测起始日自动对齐到所有已选标的的共同最早有效交易日；若请求起始日早于某标的上市日，图表右上角显示 `Start date adjusted to YYYY-MM-DD due to asset listing history`；无有效数据的标的会记录并在图表下方提示，曲线与基准不会出现 NaN。
   - **验证结果**：`tsc --noEmit`、本次涉及文件 ESLint 通过；Chrome 实测 Custom 日期栏/剧本、免费 PRO 升级提示、DCA 参数与本金线、悬停 P/L；另用合成数据验证上市日期对齐（请求 2020-01-01、实际对齐到 2020-01-06，曲线/基准无 NaN，无重叠日期返回 null）。
3. **涉及的核心文件路径**：`components/simulator/SimulatorWorkbench.tsx`、`components/simulator/SimulatorChart.tsx`、`components/simulator/engine.ts`、`components/dca/PeriodTabs.tsx`、`app/dashboard/page.tsx`、`CHANGELOG.md`。
4. **架构与设计约定（Do Not Break）**：
   - `Custom` 必须仅对 Pro/Admin 解锁；免费用户只能看到 `✦ PRO` 并触发升级，不得渲染可用日期栏。
   - 回测起始日必须先对齐所有已选标的的共同最早有效交易日；不得通过丢弃资产或输出 NaN 规避上市日期差异，调整提示必须保留。
   - DCA 主图固定为绿色组合线 + 灰色虚线 S&P 500 镜像 + 淡紫 `#c4b5fd` 阶梯虚线本金；P/L 与 Alpha 的悬停读数不得丢失。
   - 新增 UI 文案全部使用金融英文；不修改任何既有中文文案。保持 720×240 viewBox、红色/绿色暗色霓虹图表语言与现有自定义 SVG 绘制逻辑。

---

## 2026-11-18 - 首页 Features 六卡网格、Hero 排版与英文文案精修（style / fix）

1. **日期与版本主题**：2026-11-18 — 首页 Features 补齐 2×3 网格，移除英文站的双语自述，优化 Hero 层级与 `?error` 地址栏清理。
2. **核心改动内容**：
   - **Features 文案**：`Indicators & valuations` 描述替换为 “Spot overbought levels and historical valuation extremes at a glance.”；`Global context, kept quiet` 改为 `Multi-market macro view` 并使用新描述；`AI market assistant` 去掉 “Connect an LLM key” 开发者术语；新增第 6 张 `Cloud Watchlist Sync` 卡片（指定英文描述）。
   - **英文站去双语自述**：清理 `lib/i18n.ts` 中英文 locale 的 “bilingual” 表述（AI Analysis / AI Earnings 副标题），中文 locale 的“中英双语”保留。
   - **Hero 排版**：副标题字号上调、提高对比度，增加副标题与 CTA 按钮组之间的垂直间距；保持现有深色紫金视觉与响应式结构。
   - **URL 清理**：新增 `components/ClearErrorParam.tsx`，仅在首页挂载；检测到 `?error` 时用 `history.replaceState` 清除查询参数，不触发刷新或重新请求。
   - **品牌**：继续统一使用 `FolioScope`，不新增旧品牌或大小写混用。
   - **验证结果**：首页 Features 渲染 6 张卡片且文案逐字匹配；带 `?error` 的首页加载后 `window.location.search` 为空；副标题计算字号 20px、颜色提升为 `slate-300`。`npx tsc --noEmit`、ESLint、`npm run build` 全部通过。
3. **涉及的核心文件路径**：`app/page.tsx`、`components/ClearErrorParam.tsx`（新增）、`lib/i18n.ts`、`CHANGELOG.md`。
4. **架构与设计约定（Do Not Break）**：
   - 不改动 Dashboard、Equity Curve、Simulator 图表与现有深色紫金卡片体系。
   - Features 网格保持 2 列 × 3 行（`sm:grid-cols-2`），6 张卡片文案与图标一一对应。
   - 英文站不得再出现 “English and Chinese” / “bilingual” 这类双语自述；中文站文案不受影响。
   - `?error` 清理只允许操作浏览器 history，不得触发页面刷新、登录重定向或新增鉴权拦截。

---

## 2026-11-18 - FolioScope 品牌升级与支付审核合规页面（feat / style / docs）

1. **日期与版本主题**：2026-11-18 — 全站品牌统一为 FolioScope，主域名固定为 `https://folioscope.live`；新增 4 个公开合规页面并更新 Pricing 与全站页脚。
2. **核心改动内容**：
   - **品牌与域名**：新增 `lib/site.ts` 集中维护 `SITE_NAME = "FolioScope"`、`SITE_URL = "https://folioscope.live"`、联系邮箱 `etatheh@hotmail.com` 与合规链接；`app/layout.tsx` 配置 `metadataBase`、`title.default/template`、Open Graph/Twitter 元数据。
   - **Logo / Title 替换**：`components/Navbar.tsx`、`components/dashboard/DashboardShell.tsx`、`app/dashboard/markets/[symbol]/page.tsx` 的 Logo 文本替换为 `FolioScope`；`app/page.tsx`、`app/pricing/page.tsx`、`app/journey/page.tsx`、`app/journey/[category]/[slug]/page.tsx`、`app/dashboard/page.tsx` 的 metadata/title 统一品牌后缀；新增 `app/login/layout.tsx`、`app/register/layout.tsx` 提供页面标题。
   - **全站页脚**：新增 `components/SiteFooter.tsx`，固定展示 Disclaimer / Terms of Service / Privacy Policy / Refund Policy 四个链接、精简免责声明与 `© FolioScope. All rights reserved.`；挂载到首页、Pricing、登录/注册、Journey 列表/文章及 4 个合规页。
   - **4 个公开合规页面**：新增 `app/disclaimer/page.tsx`、`app/terms/page.tsx`、`app/privacy/page.tsx`、`app/refund/page.tsx`，共用 `components/legal/LegalPage.tsx` 深色阅读排版；英文正文严格按用户提供原文逐段落位，不删减、不改写。路由默认公开；若未来新增 middleware/proxy，必须将这 4 个路径列入白名单。
   - **Pricing 更新**：`lib/plans.ts` 调整为 Free（14 支精选股票 + 基础回测）与 Pro（全市场股票搜索 + 欧美日韩多市场 + AI 财报深度总结）的美元定价对比；`app/pricing/page.tsx` 在订阅按钮下方增加 Terms / Privacy / Refund 链接，并同步首页定价卡片；FAQ 支付与取消说明改为合规口径。
   - **品牌残留清理**：`lib/i18n.ts`、`lib/chat.ts`、`app/api/chat/route.ts` 中用户可见的 `indepth AI` / `Indepth` 品牌文案替换为 `FolioScope AI` / `FolioScope`；不修改 `indepth:*` 事件名、localStorage key 等内部兼容标识，避免破坏已有会话与本地状态。
   - **验证结果**：`npx tsc --noEmit`、`npx eslint app components lib --max-warnings=0`、`npm run build` 全部通过；匿名访问 `/disclaimer`、`/terms`、`/privacy`、`/refund` 均返回 200，且构建产物将四个页面识别为静态公开路由。
3. **涉及的核心文件路径**：`lib/site.ts`（新增）、`components/SiteFooter.tsx`（新增）、`components/legal/LegalPage.tsx`（新增）、`components/legal/LegalInlineLinks.tsx`（新增）、`app/disclaimer/page.tsx`（新增）、`app/terms/page.tsx`（新增）、`app/privacy/page.tsx`（新增）、`app/refund/page.tsx`（新增）、`app/layout.tsx`、`app/page.tsx`、`app/pricing/page.tsx`、`lib/plans.ts`、`components/Navbar.tsx`、`components/dashboard/DashboardShell.tsx`、`app/dashboard/page.tsx`、`app/dashboard/markets/[symbol]/page.tsx`、`app/journey/page.tsx`、`app/journey/[category]/[slug]/page.tsx`、`app/login/page.tsx`、`app/register/page.tsx`、`app/login/layout.tsx`（新增）、`app/register/layout.tsx`（新增）、`lib/i18n.ts`、`lib/chat.ts`、`app/api/chat/route.ts`、`components/ai/MarkdownText.tsx`（注释）、`components/ui/UpgradeModal.tsx`（注释）、`.env.example`、`supabase/schema.sql`、`supabase/usage.sql`（品牌注释）。
4. **架构与设计约定（Do Not Break）**：
   - **图表与 Dashboard 布局保护**：严禁修改 `components/simulator/*`、`components/dca/*`、`components/market-cards.tsx`、`components/MarketBoard.tsx`、`components/UsStockPanel.tsx` 的净值曲线（Equity Curve）样式、配色、交互与仪表盘布局；本任务只允许在 Dashboard 页面补充 metadata，不得改动 `DashboardShell` 主体布局（Logo 文本除外）。
   - **公开路由**：`/disclaimer`、`/terms`、`/privacy`、`/refund` 必须无需登录直接访问；当前项目没有 middleware/proxy，若后续增加鉴权拦截，必须将这四个路径加入公开白名单。
   - **合规正文**：四个页面的英文正文只能逐字使用用户提供的版本，不得删减、合并或改写；仅允许增加页面壳、标题、导航、页脚等外围结构。
   - **品牌单一来源**：品牌名与主域名以 `lib/site.ts` 为唯一来源；不要再在页面里散落硬编码 `FolioScope` 域名。内部 `indepth:*` 事件名、`indepth.*` localStorage key 与既有 API 路径保持不变。
   - **页脚与 Pricing**：页脚必须始终包含四个合规链接与精简免责声明；Pricing 的 Free/Pro 权益与美元价格必须与 `lib/plans.ts` 一致，订阅按钮下方必须保留 Terms / Privacy / Refund 链接。
   - **支付文案**：合规页明确 Creem 为 Merchant of Record；前端升级文案与 Pricing FAQ 使用 Creem 口径，但不得改动现有结算 API/环境变量逻辑（本次不重构支付集成）。

---

## 2026-11-18 - Dashboard 侧边栏重构、Markets 独立视图与 Simulator 旧版图表还原（refactor / feat / fix）

1. **日期与版本主题**：2026-11-18 — 深色金融看板改为侧边栏 + 独立视图结构；新增欧洲/亚太指数与后端白名单；合并 Lump Sum / DCA 工作台并按旧版组件还原青绿色交互图表。
2. **核心改动内容**：
   - **导航结构**：新增 `DashboardShell`（桌面固定侧边栏 + 一键折叠为图标模式 + 悬停弹出 Markets 二级菜单；移动端汉堡菜单 + 半透明遮罩抽屉 + 选中自动收起 + 背景滚动锁定）。底部固定 `FREE/PRO/ADMIN` 徽章、`Account Settings` 入口与 `Upgrade to Pro` 按钮；Watchlist 项展示 `count/14` 免费额度。
   - **独立视图**：`?view=` 切换 7 个视图（all / us / europe / asia / watchlist / simulator / ai），服务端只渲染当前视图，不再堆叠长页面；默认 `all` 展示全球指数总览（`GlobalMarketsOverview`）。
   - **Markets 数据**：新增欧洲面板（`^FTSE`、`^GDAXI`、`^FCHI`，仅指数不加入个股）与亚太面板扩充（`^HSI`、`000001.SS` + 原日韩股票）；`/api/markets/quote`、`/api/markets/series` 将上述指数加入匿名/FREE 白名单，`isPublicIndexSymbol()` + `normalizeSymbol()` 统一放行，`market-series` 路由到对应 secid。
   - **Simulator 二合一**：新增 `SimulatorWorkbench` 统一 `Lump Sum（一次性买入）/ DCA（定期定额）` 切换、共享 14 只免费精选股选股器与紫色权重滑块、`PeriodTabs` 周期选择；DCA 动态展开每期金额与 Weekly / Bi-weekly / Monthly 频率；统计卡为 Total Invested / Final Value / Total Return / Max Drawdown / CAGR。
   - **旧版图表还原**：按用户要求从 git 中 `7cf706e` 的 `components/PortfolioSimulator.tsx` 提取原始图表代码，替换掉中间版本那套紫色简化折线。恢复 `720×240` viewBox、5 条网格线、`MM-DD` 日期轴、**2px 青绿色实线 + 1.4px 灰色虚线**、绿色辉光、十字准线（横+竖虚线）、端点圆点与每日数值读数；交互改为 `PointerEvent` 同时支持鼠标与手指滑动（`touch-action: pan-y`）。
     - Lump Sum：青绿色 = 组合净值，灰色虚线 = S&P 500 基准（均归一化到 100）。
     - DCA：青绿色 = 组合总市值，灰色虚线 = 累计投入本金（绝对美元）。
   - **AI Analysis 视图**：新增 `AiAnalysisPanel`，集中展示 AI 市场摘要与 14 只精选股的 `AI Earnings Analysis` 触发入口；卡片按钮仍复用原 `StockReportButton` 弹窗。
   - **移动端与排版修复**：根布局/主区域/网格/卡片补齐 `overflow-x-hidden` / `overflow-x-clip` / `min-w-0`；修复移动端 Simulator 控件行重叠、图表 y 轴顶裁切、AI 悬浮按钮压住抽屉底部；删除 `Recent activity` / `WEEKLY FOCUS` 等建站模板占位及对应 i18n 文案。
   - **预览与验证**：新增 `public/_preview/gallery.html` + 截图（仅用于效果确认，可整目录删除）；通过 `tsc --noEmit`、`eslint`、`next build` 与页面/接口 200 冒烟（all/us/europe/asia/watchlist/simulator/ai 及新指数 quote/series）。
3. **涉及的核心文件路径**：`app/dashboard/page.tsx`（重写为视图分发）、`components/dashboard/DashboardShell.tsx`（新增）、`lib/dashboard-views.ts`（新增）、`components/markets/GlobalMarketsOverview.tsx`（新增）、`lib/europe-markets.ts`（新增）、`lib/index-quotes.ts`（新增）、`lib/index-symbols.ts`（新增）、`lib/market-series.ts`（新增）、`lib/asia-markets.ts`、`lib/instruments.ts`、`lib/access.ts`、`lib/watchlist.ts`、`lib/i18n.ts`、`lib/us-stocks.ts`、`app/api/markets/quote/route.ts`、`app/api/markets/series/route.ts`、`components/simulator/SimulatorWorkbench.tsx`（新增）、`components/simulator/SimulatorChart.tsx`（新增，基于旧版代码还原）、`components/simulator/engine.ts`（新增）、`components/ai/AiAnalysisPanel.tsx`（新增）、`components/MarketBoard.tsx`、`components/UsStockPanel.tsx`、`components/market-cards.tsx`、`components/ui/Icon.tsx`、`components/watchlist/`（`WatchlistHub.tsx`、`WatchlistNavButton.tsx`、`MarketSearch.tsx`、`QuoteCard.tsx`）、`app/dashboard/markets/[symbol]/page.tsx`、`public/_preview/`（临时预览，可删）。
4. **架构与设计约定（Do Not Break）**：
   - **Simulator 图表样式即核心视觉资产**：必须保持旧版 `PortfolioSimulator` 的青绿色 2px 实线（#34d399）、灰色 1.4px 虚线（#94a3b8）、绿色辉光、十字准线 + 端点圆点 + 每日数值读数、`720×240` viewBox 与 `MM-DD` 日期轴；**不得再用紫色简化折线或普通双线面积图替换**。Lump Sum 灰线 = S&P 500 基准（归一化 100），DCA 灰线 = 累计投入本金（绝对值），这一语义不可混用。
   - **视图结构**：侧边栏 + `?view=` 独立视图是新的信息架构，不要回退到单页长滚动堆叠；Markets 父级默认展开且含 4 个子项（All Markets / U.S. Markets / Europe / Asia-Pacific），移动端抽屉选中后必须自动收起并锁定背景滚动。
   - **权限与白名单**：`isProTier()` 仍是唯一付费判定；指数对所有人可见，14 只精选股是模拟器独立白名单，`/api/markets/*` 的服务端校验不可仅靠前端隐藏；`^FTSE`/`^HSI`/`000001.SS` 等指数符号依赖 `isPublicIndexSymbol()` 与 `normalizeSymbol()` 放行，不要移除。
   - **Simulator 免费池**：免费用户可选 14 只精选标的，Pro 保留全美股搜索加入权限；`getSimulationData` 的日历对齐与 14 只名单过滤逻辑不可破坏。
   - **移动端约束**：根容器与主区域保持 `overflow-x-hidden`，网格/卡片 `min-w-0`；Simulator 控件行在 375px 下不得重叠，周期 tabs 允许内部横向滚动但不得引起页面横向溢出。
   - `public/_preview/` 仅为本次效果确认用的截图产物，不影响功能，确认后可整体删除，不视为生产资产。

---

## 2026-11-18 - 协作规范落地：AGENTS.md 与 CHANGELOG.md 统一

1. **日期与版本主题**：2026-11-18 — 建立 AI 协作强制工作流与单一变更交接日志。
2. **核心改动内容**：
   - **更新** 根目录 `AGENTS.md`：保留 Next.js 自动注入的规则注释块，新增三强制工作流——① 接手必读（先读 AGENTS.md 与 CHANGELOG.md 最近 3 条）② 修改前备份（大改前工作区干净则先 `git commit` 快照）③ 部署前强制登记（push 前必须更新 CHANGELOG.md）；并补充项目速览、不可破坏约定速览、最小检查清单。
   - **新建** 根目录 `CHANGELOG.md`：采用倒序时间线、固定 4 项结构，把原先散落在 `docs/changes/*.md` 的 6 份变更记录与近期 git 提交（自选股/模拟器/滚动条）统一合并为本文件的历史条目。
   - **合并/移动**：`docs/changes/2026-11-16-*.md`、`2026-11-17-*.md` 共 6 份日志内容迁入本文件，原文件移除；`docs/changes/README.md` 改为指向本文件的简短说明；`CLAUDE.md`（内容仅 `@AGENTS.md`）保持不变，继续作为指向根 AGENTS.md 的兼容入口。
3. **涉及的核心文件路径**：`AGENTS.md`（更新）、`CHANGELOG.md`（新建）、`docs/changes/README.md`（改为指针）、`docs/changes/2026-11-16-auth-modal-and-navbar.md`、`docs/changes/2026-11-16-ui-and-dca-overhaul.md`、`docs/changes/2026-11-17-account-modal.md`、`docs/changes/2026-11-17-ai-assistant-drawer.md`、`docs/changes/2026-11-17-global-scrollbars.md`、`docs/changes/2026-11-17-pro-tier-unification.md`（以上 6 份已合并后移除）、`CLAUDE.md`（未改动）。
4. **架构与设计约定（Do Not Break）**：
   - `AGENTS.md` 顶部 `<!-- BEGIN:nextjs-agent-rules -->` / `<!-- END:nextjs-agent-rules -->` 注释块**绝对不能删除或改写**，Next.js 工具链依赖该标记。
   - 三条强制工作流是后续所有 Session 的入口约定，不可弱化或删除。
   - `CHANGELOG.md` 必须保持**倒序时间线**和**每条固定 4 项**；历史条目只增不改。
   - `CLAUDE.md` 的 `@AGENTS.md` 引用是指向根准则的兼容入口，保留。

---

## 2026-11-17 - 模拟器免费标的扩容、自选股云同步与 Pro 全市场搜索（feat）

1. **日期与版本主题**：2026-11-17 — 自选股云同步、精选池、Pro 全市场搜索，模拟器向免费用户开放 14 只精选标的回测。
2. **核心改动内容**：
   - 新增自选股云同步（watchlist store + `/api/watchlist`），精选池与云端列表保持一致；顶部加入自选股导航入口与角标（管理员显示 `ADMIN`）。
   - 全市场搜索（`/api/market/search`）对 Pro/Admin 开放完整标的，免费用户仅命中精选池；行情报价与序列接口按 tier 分流。
   - 投资模拟器（lump sum / DCA）向免费用户开放 **14 只精选标的**回测，其余仍按 Pro 付费墙锁定。
   - 新增欧洲市场指数面板、指数报价/符号表与 `market-series` 数据层，Dashboard 视图按 `dashboard-views.ts` 组织。
3. **涉及的核心文件路径**：`lib/access.ts`、`lib/watchlist.ts`、`lib/watchlist-store.ts`、`lib/instruments.ts`、`lib/us-stocks.ts`、`lib/asia-markets.ts`、`lib/europe-markets.ts`、`lib/index-quotes.ts`、`lib/index-symbols.ts`、`lib/market-series.ts`、`lib/dashboard-views.ts`、`app/api/watchlist/route.ts`、`app/api/market/search/route.ts`、`app/api/markets/quote/route.ts`、`app/api/markets/series/route.ts`、`components/watchlist/`（`WatchlistHub.tsx`、`WatchlistNavButton.tsx`、`MarketSearch.tsx`、`QuoteCard.tsx`、`FavoriteButton.tsx`、`WatchlistProvider.tsx`）、`components/markets/GlobalMarketsOverview.tsx`、`components/simulator/`（`SimulatorWorkbench.tsx`、`SimulatorChart.tsx`、`engine.ts`）、`components/ui/Icon.tsx`。
4. **架构与设计约定（Do Not Break）**：
   - 免费权限白名单以 `FREE_STOCK_SYMBOLS`（各市场 4 只）与 `INDEX_SYMBOLS` 为准，**指数始终对所有用户可见**；模拟器 14 只精选名单是独立白名单，不要误改为全量开放。
   - 全市场搜索与付费行情必须服务端校验 `isProTier(tier)`，不能仅靠前端解锁卡片。
   - 自选股数据以服务端/云端为准，客户端 store 同步时不得覆盖服务端 tier 与鉴权信息。
   - 模拟器图表复用 DCA 视觉语言：紫色主线 `#a78bfa`（或 emerald `#34d399` 复古色）、金色虚线本金线 `#fbbf24`、霓虹发光 + 流光 + 终点脉冲 + 十字准星 tooltip；`accent` 语义不要破坏。

---

## 2026-11-17 - 全局暗紫玻璃滚动条（style）

1. **日期与版本主题**：2026-11-17 — 统一全站滚动条为 5px 暗紫玻璃细条。
2. **核心改动内容**：
   - `app/globals.css`：Firefox `scrollbar-width: thin` + `scrollbar-color: rgba(168,85,247,0.22) transparent`；Chromium `::-webkit-scrollbar` 宽高 5px、track/corner 透明、thumb 圆角 `9999px`、背景 `rgba(168,85,247,0.22)`、hover `rgba(168,85,247,0.5)`。
   - 删除 `.auth-legal-scroll` 原有 6px / 0.3 的独立滚动条样式，仅保留 `overscroll-behavior: contain`，全站统一走全局规则。
3. **涉及的核心文件路径**：`app/globals.css`。
4. **架构与设计约定（Do Not Break）**：
   - 滚动条宽度固定 **5px**、颜色 `rgba(168,85,247,0.22)` / hover `0.5` 是深色玻璃视觉的一部分，**不要改回浏览器默认灰色宽滚动条**。
   - `html, body, *` 的通用选择器覆盖范围需保留（含 AI 抽屉、AuthModal 条款、AccountModal）；Firefox 回退规则不可删。
   - 不要给单个弹窗重新引入自定义滚动条宽度，避免与全局规则冲突。

---

## 2026-11-17 - 账号管理弹窗：资料编辑、套餐额度与安全销号（feat）

1. **日期与版本主题**：2026-11-17 — 新增账号管理弹窗，支持昵称修改、额度展示与二次确认销号。
2. **核心改动内容**：
   - 新增 `AccountModal`（暗黑紫金毛玻璃，Escape/遮罩关闭、焦点陷阱、滚动锁定、reduced motion）：Profile 区修改昵称（2–32 字符）、Plan & AI Credits 区展示套餐与剩余额度、Danger Zone 要求手动输入大写 `DELETE` 才启用永久删除。
   - 新增共享组件 `UserAvatar`、`ToastHost`（全局 `showToast()` 事件，挂在根布局）；`UserMenu` 下拉改为打开账号弹窗，每次 nonce 重挂载。
   - 后端新增 `GET /api/chat`（额度查询）、`POST /api/account/profile`（service-role 写入 `profiles.full_name`）、`lib/server/request-user.ts`（统一 Bearer/cookie 解析）；新增 `supabase/profiles.sql`（表、RLS、`delete_user_account()` RPC）。
3. **涉及的核心文件路径**：`components/account/AccountModal.tsx`（新增）、`components/ui/UserAvatar.tsx`（新增）、`components/ui/ToastHost.tsx`（新增）、`components/UserMenu.tsx`、`app/layout.tsx`、`app/api/chat/route.ts`、`app/api/account/profile/route.ts`（新增）、`lib/server/request-user.ts`（新增）、`lib/auth.ts`、`lib/use-session.ts`、`lib/i18n.ts`、`supabase/profiles.sql`（新增）。
4. **架构与设计约定（Do Not Break）**：
   - 线上 `profiles` **浏览器端只读（仅 select RLS）**；昵称/tier 写入必须走 service-role 的 `/api/account/profile`，**绝不能**为图方便开放客户端 UPDATE policy，否则用户可把自己改成 pro/admin。
   - 销号必须保留大写 `DELETE` 二次确认 + `delete_user_account()` RPC + 退出登录 + Toast 的完整链路；不可简化为一次点击。
   - `ToastHost` 必须挂在根布局，保证 `UserMenu` 卸载后仍能提示。
   - 弹窗统一遵循暗黑紫金毛玻璃、焦点陷阱、滚动锁定与 `prefers-reduced-motion` 降级。

---

## 2026-11-17 - Pro 权限统一为 `tier` 判定，ADMIN 徽章与无限额度（fix / refactor）

1. **日期与版本主题**：2026-11-17 — 统一前后端 Pro 判定，补齐服务端付费校验。
2. **核心改动内容**：
   - `lib/access.ts` 新增 `AccessTier`、`isProTier()`（唯一规则：`tier === "pro" || tier === "admin"`）、`isAdminTier()`、`highestTier()`、`tierToViewerPlan()`；`getViewerPlan()` / `hasFullDashboardAccess()` 复用该规则并取最高权限。
   - 后端：`AuthUser` 增加 `tier`；`ADMIN_EMAILS` 命中时 `plan="pro" / tier="admin" / isAdmin=true`；`/api/auth/me` 合并 Supabase `profiles.tier` 与 `app_metadata.role === "admin"`，返回权威 tier；`/api/agent` 新增 403 `UPGRADE_REQUIRED` 并让 admin 跳过额度计量；`/api/chat` 管理员判定改为 `tier === "admin"`；`/api/ai/stock-report`、`/api/markets/quote`、`/api/markets/series`、`/api/market/search`、`/api/billing/checkout` 统一 `isProTier(tier)` 放行；`/api/auth/upgrade` 仅允许 admin。
   - 前端：`use-profile.ts` 的 `isPro` 复用 `isProTier`，profile 与 session tier 取最高值；`use-session.ts` 用 Bearer 调 `/api/auth/me` 合并权威 tier；UserMenu/AccountModal 按 live tier 显示 `ADMIN / PRO / FREE` 与 `∞` 额度。
3. **涉及的核心文件路径**：`lib/access.ts`、`lib/server/auth-service.ts`、`lib/server/auth.ts`、`lib/server/request-user.ts`、`supabase/profiles.sql`、`lib/use-session.ts`、`lib/use-profile.ts`、`app/api/auth/me/route.ts`、`app/api/auth/upgrade/route.ts`、`app/api/account/profile/route.ts`、`app/api/agent/route.ts`、`app/api/chat/route.ts`、`app/api/ai/stock-report/route.ts`、`app/api/billing/checkout/route.ts`、`app/api/markets/quote/route.ts`、`app/api/markets/series/route.ts`、`app/api/market/search/route.ts`、`components/UserMenu.tsx`、`components/account/AccountModal.tsx`、`components/AiSummaryCard.tsx`、`components/DcaBacktestCard.tsx`、`components/PortfolioSimulator.tsx`、`components/stock/StockReportButton.tsx`、`components/UpgradeButton.tsx`、`components/ui/UpgradeModal.tsx`、`components/watchlist/WatchlistHub.tsx`。
4. **架构与设计约定（Do Not Break）**：
   - **`isProTier()` 是唯一付费判定来源**：任何新 API/组件都不得再写 `plan === "pro" || isAdmin` 之类的分散判断，避免漏掉 admin。
   - 管理员必须享无限 AI 额度并在 UI 显示 `∞`，且开发者权限不依赖账单状态。
   - 所有付费接口必须服务端校验；**绝不信任前端隐藏**：免费用户直调 `/api/agent` 必须得到 403 `UPGRADE_REQUIRED`。
   - `profiles.tier` 被服务端信任，线上库必须保持浏览器端只读；若存在 `profiles_update_own` policy 必须删除。
   - `highestTier()` 取最高值逻辑不可倒置，防止过期低 tier 降级管理员。

---

## 2026-11-17 - indepth AI 悬浮助手：流式对话与实时页面上下文（feat）

1. **日期与版本主题**：2026-11-17 — 新增 SSE 流式 AI 助手，携带页面实时上下文并在服务端强制鉴权与合规。
2. **核心改动内容**：
   - 新增 `/api/chat`（Node runtime，`maxDuration=60`）：OpenAI 兼容接口，支持 `AI_*` 主变量与旧 DeepSeek/DASHSCOPE/AGENT 变量兼容；优先校验 Supabase Bearer 再回退 cookie，未登录 401；`getUsage`/`incrementUsage` best-effort 额度计量并回传 `X-Quota-*`；解析上游 SSE `choices[0].delta.content`，供应商忽略 stream 时退化为一次性文本；`AbortController` 支持客户端断开取消。
   - 系统 Prompt 人格为 **indepth AI**；模型未附合规提示时服务端自动补 `> 仅供参考，不构成投资建议。` / `> For reference only — not investment advice.`。
   - 新增 `lib/chat.ts`（消息/上下文规范化与裁剪、`formatMarketContext`、`buildSystemPrompt`、`COMPLIANCE_NOTE`）、`lib/ai-context-store.ts`（`useSyncExternalStore` 外部 store）。
   - 新增 `AiAssistantDrawer.tsx`（右下角渐变按钮 + framer-motion 抽屉、Live Context 徽章、3 个快捷提问胶囊、Markdown 流式渲染、发送/停止按钮）与轻量 `MarkdownText.tsx`；替换旧 `AgentChat`。DCA 与个股详情页发布实时上下文到 store；免费用户只同步方案输入，不同步回测结果。
3. **涉及的核心文件路径**：`app/api/chat/route.ts`（新增）、`components/ai/AiAssistantDrawer.tsx`（新增）、`components/ai/MarkdownText.tsx`（新增）、`components/ai/AiAnalysisPanel.tsx`、`lib/chat.ts`（新增）、`lib/ai-context-store.ts`（新增）、`lib/agent-context.ts`、`components/DcaBacktestCard.tsx`、`components/UsStockPanel.tsx`、`app/dashboard/page.tsx`、`app/dashboard/markets/[symbol]/page.tsx`、`lib/i18n.ts`、`.env.example`。
4. **架构与设计约定（Do Not Break）**：
   - `/api/chat` 的 **401 未登录校验、服务端强制合规提示、SSE 流格式**不可删除；未配置 `AI_API_KEY` 时必须返回明确提示。
   - 免费用户的上下文发布必须脱敏（只同步输入，不回传回测结果），避免绕过付费墙。
   - 额度计量为 best-effort，存储异常不应阻断回答；admin 仍走无限额度。
   - 抽屉视觉：暗黑紫金毛玻璃 + 更不透明渐变底、脉冲绿点 Live Context 徽章、5px 暗紫滚动条，遵循 reduced motion；中英文文案跟随 `lang`。
   - 旧 `/api/agent` 与 `AgentChat` 仅为兼容保留，不要重新挂载到页面。

---

## 2026-11-17 - 认证弹窗、双语合规条款与移动端顶部导航（feat / fix / style）

1. **日期与版本主题**：2026-11-17 — 全局单实例认证弹窗、双语法律条款与 375px 单行导航。
2. **核心改动内容**：
   - 新增 `AuthModal`（Google 主推 + Microsoft Coming soon + 邮箱登录/注册 + 底部可点击双语条款视图）与 `AuthModalProvider`（根布局挂载一次，`openAuthModal({ mode, lang })` 调起，nonce 重挂载）；新增 `lib/legal.ts` 中英双语服务条款/隐私政策/金融免责声明，明确回测与 XIRR 仅为假设性参考。
   - 新增 `lib/supabase/client.ts`（浏览器懒加载单例）与 `/api/auth/config`（只返回 URL 与 publishable/anon key，不暴露 secret）；`use-session.ts` 接入 Supabase 会话并优先于旧 cookie。
   - `LangToggle` 双胶囊 → 单按钮写 `lang` cookie；Dashboard 头部改为标题行 + 控件行，375px 下语言/升级/♡/登录/头像单行不换行；英文模式去除中文副标题；UserMenu 支持 Google 头像与 `FREE/PRO/ADMIN` 徽章；Navbar 与解锁 CTA 统一走 AuthModal。
3. **涉及的核心文件路径**：`components/auth/AuthModal.tsx`（新增）、`components/auth/AuthModalProvider.tsx`（新增）、`lib/legal.ts`（新增）、`lib/supabase/client.ts`（新增）、`app/api/auth/config/route.ts`（新增）、`components/LangToggle.tsx`、`components/UserMenu.tsx`、`components/Navbar.tsx`、`components/UsStockPanel.tsx`、`components/MarketBoard.tsx`、`components/PriceChart.tsx`、`components/ui/ProUpgradeButton.tsx`、`components/ui/UnlockCtaButton.tsx`、`components/ui/UpgradeModal.tsx`、`lib/auth.ts`、`lib/use-session.ts`、`lib/i18n.ts`、`app/layout.tsx`、`app/dashboard/page.tsx`、`app/dashboard/markets/[symbol]/page.tsx`、`app/globals.css`。
4. **架构与设计约定（Do Not Break）**：
   - `/api/auth/config` **绝不能返回 Supabase secret key**，只能返回 URL 与 publishable/anon key。
   - AuthModal 必须保持**全局单实例**（根布局挂载一次）；不要在每个按钮里各自渲染弹窗。
   - 375px 头部必须单行、`scrollWidth <= innerWidth`；英文模式 `document.body.innerText` 不得含 CJK 字符；A 股面板仅中文模式显示。
   - 法律条款中的"回测/XIRR/模拟仅为假设性参考、不构成投资建议"文案与金融免责声明不可删除。
   - 弹窗保持 Escape/遮罩关闭、焦点陷阱、滚动锁定与 reduced motion。

---

## 2026-11-16 - 品牌图标、语言记忆与 DCA 定投回测多周期重构（feat / refactor / style）

1. **日期与版本主题**：2026-11-16 — InDepth 品牌标识与 SVG 图标、语言 cookie 记忆、英文名称修正，DCA 回测升级为多周期 + 双指数对比。
2. **核心改动内容**：
   - 新增 `components/ui/Icon.tsx`（5 个 server-safe 线性 SVG）；首页特性卡 emoji → Icon；Navbar 加入蓝紫渐变趋势线 mark + InDepth 词标；删除 Dashboard `Projects` 硬编码占位及对应 i18n 文案。
   - 新增 `lib/lang-pref.ts`：`?lang=` → cookie → 浏览器语言 → en；`LangToggle` 写 cookie 并支持保留 `redirect`；登录/注册页加语言切换；Dashboard 读 cookie，记住中文后 A 股面板自动出现。
   - `market-cards.tsx` 与个股详情 `<h1>` 按语言显示中/英文主名；UserMenu 头像统一蓝紫渐变、英文模式中文首字回退邮箱首字母；`next.config.ts` 关闭 `devIndicators`。
   - **DCA 重构**：`lib/dca.ts` 改为 `getDcaDataset()`，抓 INX 与 NDX 各最多 120 个月；新增 `components/dca/`（`engine.ts` 周期 6M/1Y/3Y/5Y/10Y + XIRR + 重采样 `SAMPLES=120`；`hooks.ts` rAF 数字滚动与曲线形变；`PeriodTabs.tsx` framer-motion `layoutId` 滑动胶囊；`MonthlyControl.tsx` 滑块+键盘双向绑定；`DcaChart.tsx` SVG 霓虹发光/渐变填充/流光/终点呼吸脉冲/十字准星磨砂 tooltip 三曲线）；`DcaBacktestCard` 支持定投标的切换与另一指数作对比线；**y 轴域与当前金额解耦**（`domainMax` 按滑块上限计算，否则拖滑块曲线不动）；`globals.css` 新增 `dca-pulse` / `dca-flow` 及 reduced-motion 降级。
3. **涉及的核心文件路径**：`components/ui/Icon.tsx`（新增）、`components/dca/engine.ts`、`components/dca/hooks.ts`、`components/dca/PeriodTabs.tsx`、`components/dca/MonthlyControl.tsx`、`components/dca/DcaChart.tsx`（均为新增）、`lib/lang-pref.ts`（新增）、`components/DcaBacktestCard.tsx`、`components/Navbar.tsx`、`components/UserMenu.tsx`、`components/LangToggle.tsx`、`components/market-cards.tsx`、`app/page.tsx`、`app/login/page.tsx`、`app/register/page.tsx`、`app/dashboard/page.tsx`、`app/dashboard/markets/[symbol]/page.tsx`、`app/globals.css`、`lib/dca.ts`、`lib/i18n.ts`、`next.config.ts`。
4. **架构与设计约定（Do Not Break）**：
   - **DCA 图表交互折线质感是核心视觉资产**：`feGaussianBlur` 双层发光滤镜、紫色主线 `#a78bfa`、金色虚线 `#fbbf24` 对比/本金线、`.dca-flow` 流光、`.dca-pulse` 终点呼吸脉冲、十字准星 + 磨砂 tooltip、rAF 形变与数字滚动、`prefers-reduced-motion` 降级——重构时**绝对不能被普通折线图或亮色主题覆盖**。
   - `domainMax` 按滑块上限计算、与当前月供金额解耦的约束不可回退，否则滑块拖动时曲线不动。
   - 重采样固定 `SAMPLES=120`，周期/对比数据依赖该对齐，改动需同步 `engine.ts` 与图表。
   - 语言优先级 `?lang=` → cookie → 浏览器 → en 与 cookie 持久化不可改；英文主名/中文副标题规则、A 股仅中文模式不可破坏。
   - 深色主题变量（`--background: #05070d` 等）与蓝紫渐变品牌色是全局基调，不要引入浅色主题覆盖。
