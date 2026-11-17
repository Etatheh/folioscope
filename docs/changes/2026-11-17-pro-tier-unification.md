# Pro 权限统一为 `tier` 判定，ADMIN 徽章与无限额度

- 日期：2026-11-17
- 类型：fix / refactor
- 影响面：全局权限判定、AI 市场摘要、AI 财报、全美股搜索、定投回测、投资模拟器、顶部导航、Account Settings

## 动机

1. Pro 权限在前后端存在两套写法：`plan === "pro" || isAdmin`、`plan === "pro" || plan === "admin"`、`isPro` 等，容易漏掉 `admin`。
2. `AccountModal` 的 tier 状态只接受 `free | pro`，`/api/chat` 返回的 `tier: "admin"` 被丢弃，ADMIN 账号在弹窗里显示 `PRO`，额度也不一定显示 `∞`。
3. 顶部导航只读会话里的 `isAdmin`，Supabase `profiles.tier === "admin"` 或 `ADMIN_EMAILS` 管理员可能只显示 `PRO/FREE`。
4. `/api/agent`（AI 市场摘要）只校验登录，没有服务端 Pro 校验，免费用户可绕过前端直接调用。

## 改动

- `lib/access.ts`
  - 新增 `AccessTier`、`isProTier()`（唯一判定：`tier === "pro" || tier === "admin"`）、`isAdminTier()`、`highestTier()`、`tierToViewerPlan()`。
  - `hasFullDashboardAccess()` 与 `getViewerPlan()` 改为复用上面的规则，支持 `plan`/`tier` 混用并取最高权限。
- 后端
  - `lib/server/auth-service.ts`：`AuthUser` 新增必填 `tier`；`ADMIN_EMAILS` 命中时 `plan="pro"`、`tier="admin"`、`isAdmin=true`。
  - `lib/server/request-user.ts`：Bearer/cookie 用户都输出 `tier`；Supabase 用户额外合并 `profiles.tier`，并识别 `app_metadata.role === "admin"`，确保 API 与 Account Settings 使用同一 tier。
  - `app/api/auth/me/route.ts`：改用 `resolveRequestUser`，同时支持 Supabase Bearer 与旧 cookie，响应显式返回 `tier`。
  - `app/api/ai/stock-report/route.ts`、`app/api/markets/quote/route.ts`、`app/api/markets/series/route.ts`、`app/api/market/search/route.ts`、`app/api/billing/checkout/route.ts`：统一使用 `isProTier(tier)` 放行。
  - `app/api/agent/route.ts`：改用 `resolveRequestUser`，新增 403 `UPGRADE_REQUIRED`，AI 市场摘要仅 `pro/admin` 可用；`admin` 跳过额度计量并返回 `unlimited: true`。
  - `app/api/chat/route.ts`：管理员判定改为 `tier === "admin"`，返回 `tier: "admin"` 与无限额度。
  - `app/api/account/profile/route.ts`：新建 profile 时写入当前 `tier`，Pro/Admin 额度为 200（Admin 由前端 `unlimited` 展示为 ∞）。
  - `app/api/auth/upgrade/route.ts`：开发者自升级仅允许 `tier === "admin"`。
  - `supabase/profiles.sql`：移除浏览器端 insert/update policy，`profiles` 仅保留本人 select；tier/资料写入统一走 service-role 的 `/api/account/profile`，避免客户端自行把 tier 改成 pro/admin。
- 前端
  - `lib/use-profile.ts`：`isPro` 复用 `isProTier`，新增 `isAdmin` 与 `useViewerPlan()`；profile 与 session 的 tier 取最高值，避免旧 profile 降级管理员。
  - `lib/use-session.ts`：Supabase 会话启动/刷新时用 Bearer 调 `/api/auth/me`，把服务端权威 `tier` 合并回会话，`ADMIN_EMAILS` 管理员顶部导航可立即显示 `ADMIN`。
  - `components/UserMenu.tsx`：徽章按 live tier 渲染 `ADMIN / PRO / FREE`。
  - `components/account/AccountModal.tsx`：tier 状态支持 `admin`；徽章显示 `ADMIN`；管理员额度显示 `∞` 与满格绿色进度条。
  - `components/AiSummaryCard.tsx`、`components/DcaBacktestCard.tsx`、`components/PortfolioSimulator.tsx`、`components/stock/StockReportButton.tsx`：改用 live tier/`useViewerPlan` 判定，并让 AI 摘要走 `apiFetch` 以携带 Supabase Bearer。
  - `components/UpgradeButton.tsx`、`components/ui/UpgradeModal.tsx`：Pro/Admin 状态改用 `profile.tier`。
  - `components/watchlist/WatchlistHub.tsx`：管理员显示 `ADMIN` 角标。

## 影响文件

- lib/access.ts
- lib/server/auth-service.ts
- lib/server/auth.ts
- lib/server/request-user.ts
- supabase/profiles.sql
- lib/use-session.ts
- lib/use-profile.ts
- app/api/auth/me/route.ts
- app/api/auth/upgrade/route.ts
- app/api/account/profile/route.ts
- app/api/agent/route.ts
- app/api/chat/route.ts
- app/api/ai/stock-report/route.ts
- app/api/billing/checkout/route.ts
- app/api/markets/quote/route.ts
- app/api/markets/series/route.ts
- app/api/market/search/route.ts
- components/UserMenu.tsx
- components/account/AccountModal.tsx
- components/AiSummaryCard.tsx
- components/DcaBacktestCard.tsx
- components/PortfolioSimulator.tsx
- components/stock/StockReportButton.tsx
- components/UpgradeButton.tsx
- components/ui/UpgradeModal.tsx
- components/watchlist/WatchlistHub.tsx

## 验证

- `npx tsc --noEmit` 通过。
- `npx eslint components lib app` 通过。
- `NEXT_DIST_DIR=.next-probe npx next build` 通过（生产构建全部路由生成成功；验证后已删除临时构建目录并把 `tsconfig.json` / `next-env.d.ts` 恢复原状）。
- 权限辅助函数脚本自检：`isProTier` / `highestTier` / `getViewerPlan` / `hasFullDashboardAccess` 的 pro/admin/free/null 组合全部通过。
- 未登录实测：
  - `/api/auth/me`、`/api/chat`、`/api/ai/stock-report`、`/api/market/search`、`/api/markets/series` 返回 401。
  - `/api/markets/quote?symbol=AAPL`（精选）仍公开；非精选返回 401。
- `/dashboard` 返回 200。
- 已知限制：本地 dev 使用 Supabase 会话，无法用临时 SQLite session 注入管理员 cookie 做端到端登录验证；管理员徽章/∞ 额度逻辑通过类型检查与代码路径复核。

## 备注 / 未决

- `profiles.tier` 现在同时被服务端信任，因此线上库必须保持 `profiles` 浏览器端只读（与现有生产策略一致）；若线上仍存在 `profiles_update_own`，请执行更新后的 `supabase/profiles.sql` 删除该 policy。
- 如果线上 profile 行的 tier 不是 `admin`，`ADMIN_EMAILS` 管理员依靠 `/api/auth/me` 的权威 tier 兜底。
- AI 市场摘要现在服务端强制 Pro；免费用户直接调用 `/api/agent` 会得到 403 `UPGRADE_REQUIRED`。