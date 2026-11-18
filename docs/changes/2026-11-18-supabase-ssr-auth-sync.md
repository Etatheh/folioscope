# Supabase SSR 登录态同步修复

- 日期：2026-11-18
- 类型：fix
- 影响面：登录/注册、OAuth 回调、Dashboard、Upgrade Pro、所有服务端鉴权 API

## 动机

登录后客户端右侧面板能识别用户，但点击 Dashboard 或 Upgrade Pro 仍提示登录。根因：

1. 浏览器使用 `@supabase/supabase-js` 的 `createClient`，Session 只写入 localStorage。
2. 服务端 Route Handler / Server Component 读不到该 Session，只认旧的 `gui_session` Cookie。
3. 没有 `/auth/callback`，OAuth 的 PKCE code 没有在服务端换取 Session 并写 Cookie。
4. `UpgradeModal` 没有等待 Auth 初始化完成，且 401 时直接跳登录。

## 改动

### 1. 统一使用 @supabase/ssr

- 新增依赖：`@supabase/ssr`
- `lib/supabase/client.ts`
  - `createClient` → `createBrowserClient`
  - Session 自动写入 Cookies，服务端可读。
- 新增 `lib/supabase/server.ts`
  - `createServerClient` + `next/headers` cookies
  - `getSupabaseServerClient()` / `getSupabaseServerUser()`
- 新增 `proxy.ts`（Next.js 16 中 Middleware 已重命名为 Proxy）
  - 每个页面请求调用 `supabase.auth.getUser()` 刷新 Session Cookie
  - `/dashboard` 未登录时重定向到 `/login?redirect=...`
  - 已登录访问 `/login`、`/register` 时跳回 `redirect` 或 `/dashboard`
  - 兼容旧 `gui_session` Cookie，不把老账号挡在 Dashboard 外

### 2. OAuth 回调

- 新增 `app/auth/callback/route.ts`
  - 使用服务端 `createServerClient` 执行 `exchangeCodeForSession(code)`
  - 将 Session 写入 Cookies 后重定向到 `next`
  - 失败时回到 `/login?error=auth_callback`
- `components/auth/AuthModal.tsx`
  - OAuth `redirectTo` 改为 `${origin}/auth/callback?next=...`
  - 邮箱登录/注册成功仍先 `router.refresh()`，再跳转。

### 3. 服务端读取最新 Session

- 新增 `lib/server/supabase-user.ts`
  - 把 Supabase User 转成应用 `AuthUser`
  - 合并 ADMIN_EMAILS / app_metadata / profiles.tier
- 新增 `lib/server/viewer.ts`
  - `getServerViewer()` 优先 Supabase SSR Cookie，回退旧 Cookie
- `lib/server/request-user.ts`
  - 鉴权顺序：Bearer → Supabase SSR Cookie → 旧 `gui_session`
  - `/api/checkout`、`/api/portal`、`/api/auth/me`、AI/行情等 API 现在都能识别浏览器登录。
- `app/dashboard/page.tsx`、`app/dashboard/markets/[symbol]/page.tsx`
  - 服务端 plan 改为通过 `getServerViewer()` 读取，登录后不再渲染匿名权限。
- `app/api/auth/logout/route.ts`
  - 同时清理 Supabase SSR Cookie 与旧 Cookie。

### 4. 等待 Auth 初始化

- `components/ui/ProUpgradeButton.tsx`
  - Auth 未 ready 时不打开升级弹窗，按钮禁用。
- `components/ui/UpgradeModal.tsx`
  - `handleUpgrade` 先检查 `ready` / `user`
  - 401 时先复查 `/api/auth/me`，服务端已认识用户则不再误跳登录。

## 影响文件

- package.json / package-lock.json
- lib/supabase/client.ts
- lib/supabase/server.ts（新增）
- lib/server/supabase-user.ts（新增）
- lib/server/viewer.ts（新增）
- lib/server/request-user.ts
- lib/server/auth-service.ts
- proxy.ts（新增）
- app/auth/callback/route.ts（新增）
- app/api/auth/logout/route.ts
- app/dashboard/page.tsx
- app/dashboard/markets/[symbol]/page.tsx
- components/auth/AuthModal.tsx
- components/ui/ProUpgradeButton.tsx
- components/ui/UpgradeModal.tsx

## 验证

- `npx tsc --noEmit` 通过。
- `npx eslint components lib app proxy.ts` 通过。
- `npx next build` 通过，构建输出包含：
  - `ƒ Proxy (Middleware)`
  - `ƒ /auth/callback`
- 本地 3001 隔离实例实测：
  - 匿名 `/dashboard` → `307 /login?redirect=%2Fdashboard`
  - 无效 code `/auth/callback` → `307 /login?error=auth_callback`
  - 匿名 `/api/auth/me` → `401`
  - `/login` → `200`

## 备注 / 未决

- 必须在 Supabase Dashboard → Authentication → URL Configuration 的 Redirect URLs 中加入：
  - `http://localhost:3000/auth/callback`
  - `https://www.folioscope.live/auth/callback`
  - 如使用 apex 域名，也加入 `https://folioscope.live/auth/callback`
- GitHub / Google OAuth App 的 callback 仍然是 Supabase 的 `https://<PROJECT>.supabase.co/auth/v1/callback`，不需要改成站点域名。
- 未改动任何页面布局、图表样式或 CSS。