# FolioScope 架构与修改定位索引

核对日期：2026-11-21。依据 `E:/my_web/personal` 当前工作区源码（包含未提交改动）；不是线上部署状态证明。路径均相对于 `personal/`。代码发生变化时，以当前 import、调用点和路由为准，并同步更新本索引。

## 1. 总体结构

这是 Next.js App Router 单体应用，UI 与服务端 API 同仓库；不是多个独立微服务。
`package.json` 声明 Next.js 16.2.9、React 19.2.4、TypeScript、Tailwind CSS 4。

- `app/`：页面、服务端数据装配、API 路由。
- `components/`：客户端交互、图表、业务 UI；部分组件为服务端组件。
- `lib/`：行情获取、算法数据、共享类型、权限、语言和客户端状态；`lib/server/` 为服务端身份、额度、数据访问等。
- `config/plans.ts`：套餐、价格及限制配置；`lib/plans.ts` 基于它生成展示数据。
- `supabase/`：数据库与 RLS SQL；`lib/supabase/` 为客户端/服务端接入。另有 `lib/server/db.ts`、`auth-service.ts` 等本地身份路径，不能假定只有一种认证来源。
- `content/`：Journey Markdown 与 Blog MDX；`public/` 为静态资源。

`app/layout.tsx` 负责全局语言、登录弹窗、自选 Provider、Toast 与支付回跳监听。
共享视觉入口为 `app/globals.css`、`components/ui/`；主页动效位于 `components/landing/LandingMotion.tsx`。

## 2. 功能定位

### 首页、导航、全局布局
- 入口：`app/page.tsx`。
- 主要 UI：`components/landing/`、`components/Navbar.tsx`、`components/SiteFooter.tsx`、`components/BrandLogo.tsx`。
- 仅首页外观先检查该目录和 `landing.module.css`；涉及全局 CSS、Navbar 或共用动效时增加其他调用页面验证。

### 看板壳与路由
- `/dashboard?view=all|us|europe|asia|watchlist|simulator|ai` 共用 `app/dashboard/page.tsx`。
- `components/dashboard/DashboardShell.tsx`：看板框架和导航；`lib/dashboard-views.ts`：视图键、解析与链接。
- `/dashb` 由 `app/dashb/page.tsx` 重定向到 `/dashboard`。
- `DashboardPage` 装配语言和服务端身份，按视图挂载业务模块。回测有独立 Suspense；其他装配位于 `DashboardContent`。
- 注意：当前 `DashboardContent` 即使处于回测视图，也会请求美股快照和 DCA 数据；不能将视图隔离理解为所有后台请求完全隔离。

### 组合回测：默认“回测模块”定位
- 页面：`/dashboard?view=simulator`。
- 首屏装配：`app/dashboard/page.tsx` 的 `SimulatorPanel`；根据套餐取历史长度、过滤标的、传默认组合。
- 参数、持仓、模式、场景和结果交互：`components/simulator/SimulatorWorkbench.tsx`。
- 收益计算：`components/simulator/engine.ts` 的 `computeSimulation`。
- 曲线、图例、悬浮交互：`components/simulator/SimulatorChart.tsx`。
- 回测票根分享：`SimulatorWorkbench` 图表标题栏 → `components/simulator/ShareTicket.tsx` → `ticket-canvas.ts`。复用当前回测结果生成 2× PNG，Free 和 Pro 均可使用。
- 配置色板、总和为 100% 的整数权重和滑块重分配：`components/simulator/allocation.ts`；环形图及持仓 Hover 联动：`components/simulator/AllocationDonut.tsx`。
- 曲线整数刻度：`components/simulator/chart-math.ts`；隔离的黑曜石样式：`components/simulator/simulator.module.css`，`DashboardShell` 仅在 simulator 视图应用壳样式。`AiAssistantDrawer` 的 `compactTrigger` 在该视图将浮动入口放入预留右侧区域。
- 初始历史及基准：`lib/us-stocks.ts` 的 `getSimulationData`、`fetchBenchmark`、`fetchUsKlines`。
- 添加标的历史：工作台调用 `/api/markets/series?symbol=...` → `app/api/markets/series/route.ts` → `lib/market-series.ts` 的 `fetchMarketSeries`。
- 行情底层：`lib/klines.ts`、`lib/yahoo-history.ts`；基准目前按 INX、Yahoo ^GSPC、SPY 路径回退，并按日期对齐。
- 共享依赖：`components/dca/engine.ts` 的周期与格式化、`dca/hooks.ts` 的动画、`dca/MonthlyControl.tsx`、`dca/PeriodTabs.tsx`；`components/watchlist/MarketSearch.tsx`；`lib/watchlist.ts` 的添加事件；`lib/ai-context-store.ts` 的 `setAiSimulator`。
- 权限及限制：`lib/access.ts`、`config/plans.ts`、`lib/use-profile.ts`、服务端 series 路由校验。

按请求直接定位：
- “曲线颜色/提示框/图例” → `SimulatorChart.tsx`。
- “持仓权重/输入控件/场景/选择标的” → `SimulatorWorkbench.tsx`。
- “收益率/最大回撤/定投频率/基准资金口径” → `simulator/engine.ts`，再查工作台传参和展示。
- “历史不够/标普曲线没数据” → `SimulatorPanel`、`getSimulationData`、行情加载器，最后检查图表消费。
- “搜索添加后没有曲线” → `MarketSearch`、添加事件、工作台 series 请求、series API 和 `fetchMarketSeries`。
- “免费/Pro 可选标的和回测年限” → 套餐配置、服务端装配、工作台限制及 API 权限，不能只改 UI。

### 定投及旧模拟组件：不要与当前回测入口混淆
- `components/DcaBacktestCard.tsx` → `components/dca/` → `lib/dca.ts`，包含指数定投和月末收盘数据逻辑。
- `components/PortfolioSimulator.tsx` 是另一套组合模拟实现。
- 本次在 `app/`、`components/` 搜索未发现这两个组件的外部挂载引用；当前组合回测入口用 `SimulatorWorkbench`。不能把旧文件当作正在显示的界面，也不要因此擅自删除。
- `lib/dca.ts:getDcaDataset` 仍被 dashboard 服务端调用；`components/dca/` 的多个工具和控件仍被当前回测复用。

### 行情看板与个股详情
- 区域看板：`components/MarketBoard.tsx`、`components/UsStockPanel.tsx`、`components/markets/GlobalMarketsOverview.tsx`。
- 美股股票／ETF 极简卡片与详情抽屉：`components/UsStockPanel.tsx` → `components/markets/StockGrid.tsx`。
- 数据：`lib/us-stocks.ts`、`cn-markets.ts`、`asia-markets.ts`、`europe-markets.ts`、`index-quotes.ts`、`index-symbols.ts`。
- 详情路由：`app/dashboard/markets/[symbol]/page.tsx`；与开发预览 `app/markets-preview/page.tsx` 共用 `components/markets/InstrumentDetailView.tsx`。行情装配：`lib/instruments.ts`。
- K 线及指标：`components/PriceChart.tsx`、`components/chart/indicators.ts`。
- 接口：`app/api/markets/quote/route.ts`、`series/route.ts`、`intraday/route.ts`；分时底层 `lib/intraday.ts`。
- 修改历史行情底层可能影响详情、回测、定投，不应只验证一个图表。

### 自选与标的搜索
- `components/watchlist/`：Provider、Hub、搜索、收藏按钮与报价卡。
- `lib/watchlist.ts`：标的与事件约定；`watchlist-store.ts`：客户端状态；`market-search.ts`：搜索逻辑。
- API：`app/api/watchlist/route.ts`、`app/api/market/search/route.ts`。
- 修改搜索/添加事件时，检查自选和回测添加两个消费入口。

### AI 研究与助手
- 看板 AI：`components/ai/AiAnalysisPanel.tsx`、`components/AiSummaryCard.tsx`。
- 浮层助手：`components/ai/AiAssistantDrawer.tsx`；文本渲染 `components/ai/MarkdownText.tsx`。
- 个股报告：`components/stock/StockReportButton.tsx`、`app/api/ai/stock-report/route.ts`、`lib/stock-report.ts`、`lib/server/stock-report-cache.ts`。
- 对话 API：`app/api/chat/route.ts`、`app/api/agent/route.ts`；相关上下文 `lib/chat.ts`、`agent-context.ts`、`ai-context-store.ts`。
- 服务端配置/额度：`lib/server/ai-config.ts`、`quota.ts`。改回测上下文结构要检查助手消费者。

### 登录、权限与账户
- 页面：`app/login/`、`app/register/`；UI：`components/auth/`、`components/account/`、`components/UserMenu.tsx`。
- OAuth：`app/auth/callback/route.ts`；API：`app/api/auth/`、`app/api/account/profile/route.ts`。
- 客户端：`lib/use-session.ts`、`use-profile.ts`；服务端页面：`lib/server/viewer.ts`；API 身份：`lib/server/request-user.ts`。
- `lib/access.ts` 是权限核心；本地调试身份在 `lib/server/local-admin.ts`。改身份来源时核对页面和 API 两条路径。

### 套餐与支付
- UI：`app/pricing/page.tsx`、`components/pricing/PricingPlans.tsx`、`components/ui/PricingModal.tsx`、升级按钮。
- 配置：`config/plans.ts`；Creem：`lib/creem.ts`；相关 `lib/billing.ts`。
- API 目录：`app/api/checkout/`、`portal/`、`webhooks/creem/`，以及 `app/api/billing/`。根据 UI 实际请求确认活跃路径，不按名称猜测。
- 回跳：`components/CheckoutReturn.tsx`，还依赖 `/api/auth/me` 刷新套餐。

### 内容、联系、SEO、语言
- Blog：`app/blog/`、`lib/blog.ts`、`content/blog/`、`docs/blog.md`。
- Blog 回测：MDX → `components/blog/BlogBacktestEmbed.tsx` → `app/api/blog/backtests/[preset]/route.ts` → `lib/server/blog-backtest.ts`。仅接受 `lib/blog-backtests.ts` 的固定公开预设，沿用免费标的和年限上限。文章静态生成，图表临近视口再读取真实行情，复用两个回测引擎和 `SimulatorChart`。
- Journey：`app/journey/`、`lib/journey.ts`、各分类 `content/`、`components/MarkdownArticle.tsx`。
- 联系：`app/contact/` → `app/api/contact/route.ts` → Resend（配置见 `.env.example`）。
- 法律：`app/privacy/`、`terms/`、`refund/`、`disclaimer/`、`components/legal/`、`lib/legal.ts`。
- SEO：`lib/site.ts`、`app/layout.tsx`、`app/sitemap.ts`、`app/robots.ts` 和页面 metadata。
- 语言：`lib/i18n.ts`、`lang-pref.ts`、`localized-text.ts`、`lib/server/lang.ts`、`components/LanguageProvider.tsx`。

## 3. 后续任务采用的检查流程

1. 先读 `AGENTS.md`、CHANGELOG 最近三条，再按本索引找到模块；不默认重扫整个仓库。
2. 在目标文件确认当前导出、import 和调用方，只沿本次改动涉及的上下游扩展一层；有共享契约变化再递归扩大。
3. 开始修改前，简述“主改文件、关联范围、验证方式”。保留工作区其他未提交改动。
4. UI 局部改动：目标文件 ESLint，加实际页面/交互检查；文档改动检查路径和内容即可。
5. 算法改动：验证相关资金流、区间、缺失数据及基准口径，并确认界面结果。数据故障要验证真实上游、API 和页面，不能以 mock 或类型通过代替恢复。
6. 类型或接口改动：运行项目类型检查与相关链路验证。全项目 tsc 是静态检查，不等于重新阅读所有业务模块。
7. 共享行情/权限/套餐/语言/全局样式改动：检查已知消费者，覆盖受影响视图；生产构建按改动风险和发布要求执行。
8. 完成后更新本索引中发生变化的入口、依赖和检查范围；部署前按 AGENTS 更新 CHANGELOG。

## 4. 边界与当前状态

- 本索引仅覆盖 `personal/`。同级 `release-landing-20261119/` 是另一份 checkout，不能默认与当前工作区一致；部署前单独确认目标。
- 本次是源码结构与引用核对，未启动浏览器、未验证上游数据或线上支付，不代表各功能已通过运行验收。
- 索引用于减少重复探索，不保证永远只改一个文件；共享契约、权限、数据源变动必须扩大检查。
