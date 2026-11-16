# UI 图标/Logo、语言记忆、英文面板修正、定投回测多周期重构

- 日期：2026-11-16
- 类型：feat + refactor + style
- 影响面：首页、导航栏、登录/注册页、Dashboard、DCA 定投回测模块、用户菜单、i18n

## 动机
1. 首页特性卡片用 emoji，与整体暗黑玻璃拟态风格不统一；导航栏缺品牌标识。
2. Dashboard 的 `Projects` 模块是硬编码占位假数据（Market Signal AI 等），与"美股情报"主题脱节。
3. 登录页语言只跟随 `navigator.language`，不读 `?lang=` 也没有切换按钮；语言选择无法跨页记忆，导致 A股中文面板"消失"。
4. 英文面板里指数/个股主名称仍显示中文（道琼斯/纳斯达克/苹果），且 admin 头像为刺眼的橙红底 + 中文字。
5. "5 年定投回测" 为单一固定周期，交互与视觉较朴素，且"定投什么"标的不可选、对比线是自己跟自己比。

## 改动

### 1. 首页 SVG 图标 + 品牌 Logo
- 新增 `components/ui/Icon.tsx`：5 个线性描边 SVG（`us / indicators / backtest / ai / globe`），server-safe。
- `app/page.tsx`：特性卡片 emoji → `<Icon>` + 渐变方框容器；features 增加 `IconName` 类型约束。
- `components/Navbar.tsx`：左侧加入蓝紫渐变趋势线 mark + **InDepth** 词标；布局改为 `Logo | 链接 | 按钮`。

### 2. 删除 Dashboard Projects 占位
- 移除硬编码 `projects[]`、侧栏 `#projects` 导航项、`<section id="projects">`、`Icon` 的 `folder` 路径。
- `lib/i18n.ts`：删除 zh/en 的 `nav.projects`、`projects` 对象及 `Dict` 对应类型。

### 3. 语言切换与记忆
- 新增 `lib/lang-pref.ts`：cookie `lang` 持久化；`resolveClientLang` = `?lang=` → cookie → 浏览器语言 → en。
- `components/LangToggle.tsx` 改为客户端组件：点击写 cookie，支持保留 `redirect` query。
- `app/login/page.tsx`、`app/register/page.tsx`：用 `resolveClientLang`，卡片右上角加 `中文/EN` 切换。
- `app/dashboard/page.tsx`：语言解析加 cookie 回退（`?lang` → cookie → en），记住中文后 A股面板自动出现。

### 4. 英文面板名称修正 + 头像
- `components/market-cards.tsx`：新增 `names(quote, lang)` —— 中文：中文主名 + 英文副标题；英文：英文主名、隐藏中文。
- `app/dashboard/markets/[symbol]/page.tsx`：详情页 `<h1>` 同样按语言切换。
- `components/UserMenu.tsx`：头像统一蓝紫渐变（去掉 admin 橙红），新增 `avatarInitial()`——英文模式遇到中文首字回退到邮箱首字母。
- `next.config.ts`：`devIndicators: false`，避免开发模式浮标盖住 Logo。

### 5. DCA 定投回测多周期重构（重点）
- `lib/dca.ts`：改为 `getDcaDataset()`，同时抓 **INX(标普500)** 与 **NDX(纳指100)** 各最多 **120 个月**收盘；支持 stale 降级。
- 新增 `components/dca/`：
  - `engine.ts`：周期定义（6M/1Y/3Y/5Y/10Y）、XIRR、DCA 模拟、重采样对齐（固定 `SAMPLES=120`）、格式化。
  - `hooks.ts`：`useAnimatedNumber`（rAF 300ms 数字滚动）、`useMorphSeries`（rAF 340ms 曲线形变）。
  - `PeriodTabs.tsx`：周期胶囊，framer-motion `layoutId` 滑动指示器；10Y 带 PRO 角标（当前允许预览）。
  - `MonthlyControl.tsx`：滑块 + 点击数字键盘输入双向绑定。
  - `DcaChart.tsx`：SVG 霓虹发光（feGaussianBlur）、渐变填充、终点呼吸脉冲、流光高光、十字准星 + 磨砂 tooltip、三条线（定投/本金/对比指数）。
- `components/DcaBacktestCard.tsx` 重写：周期状态、**定投标的切换（标普500 / 纳指100）**、对比线=另一只指数同额定投、动态副标题、XIRR 短周期口径提示。
- **y 轴域与当前金额解耦**（`domainMax` 按滑块上限计算），否则定投/本金线性正比于金额会被自动缩放抵消，拖滑块曲线不动。
- `app/dashboard/page.tsx`：改用 `getDcaDataset()` 并传 `dataset`。
- `app/globals.css`：新增 `@keyframes dca-pulse` / `dca-flow` 及 reduced-motion 降级。
- `lib/i18n.ts`：dca 增 `periods / xirrNote / tip(含 benchmark) / legend / target`。

## 影响文件
- components/ui/Icon.tsx（新增）
- components/dca/engine.ts（新增）
- components/dca/hooks.ts（新增）
- components/dca/PeriodTabs.tsx（新增）
- components/dca/MonthlyControl.tsx（新增）
- components/dca/DcaChart.tsx（新增）
- lib/lang-pref.ts（新增）
- components/DcaBacktestCard.tsx
- components/Navbar.tsx
- components/UserMenu.tsx
- components/LangToggle.tsx
- components/market-cards.tsx
- app/page.tsx
- app/login/page.tsx
- app/register/page.tsx
- app/dashboard/page.tsx
- app/dashboard/markets/[symbol]/page.tsx
- app/globals.css
- lib/dca.ts
- lib/i18n.ts
- next.config.ts
- docs/changes/*（本目录）

## 验证
- `npx tsc --noEmit` 通过；`npx next build` 通过（上一轮）。
- 浏览器 DOM 实测：
  - Navbar 品牌 `InDepth` + 趋势线 SVG；首页 5 个 SVG 图标。
  - Dashboard `#projects` 不存在；A股面板在记住中文后出现。
  - 登录页 `?lang=zh` 显示中文；点 EN 写 cookie 并覆盖浏览器语言。
  - EN 面板指数主名为英文（Dow Jones / Nasdaq / Apple…）；头像蓝紫 + 邮箱首字母。
  - DCA：紫线/金线/白虚线都在；标的按钮 `[标普500, 纳斯达克100]`；副标题 `标普500 · 5年 · 截至 2026-11`；短周期 XIRR 带"不足1年"提示；tooltip 正常。

## 备注 / 未决
- **滑块拖动未能自动化验证**：无头浏览器为匿名态，DCA 属 Pro 功能被锁定（`disabled`）。登录 ADMIN 后可拖动；y 域解耦已确保拖动时曲线真实起伏。
- 10Y 目前是"预览"，未真正接 Pro 拦截（`ProUpgradeButton` 钩子已在别处可用）。
- 首页（营销页）仍为纯英文硬编码，未接入 i18n。