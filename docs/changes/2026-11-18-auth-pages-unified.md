# 登录/注册页统一为新版 Auth 面板

- 日期：2026-11-18
- 类型：refactor / fix
- 影响面：`/login`、`/register`、全局登录弹窗、注册成功跳转

## 动机

1. 项目里同时存在两套登录 UI：
   - `components/auth/AuthModal.tsx`：带 Google、Microsoft（COMING SOON）的新版弹窗；
   - `app/login/page.tsx`、`app/register/page.tsx`：旧版纯邮箱/密码页面。
2. 两套表单的字段、错误处理、Supabase/旧 cookie fallback 逻辑重复，容易继续分叉。
3. 注册成功后没有统一的「刷新服务端会话 → 进入看板」逻辑。

## 改动

### 1. 路由盘点

- 实际存在的页面只有：
  - `app/login/page.tsx`
  - `app/register/page.tsx`
- 没有 `/signin`、`/signup` 页面。
- 登录 UI 组件只有：
  - `components/auth/AuthModal.tsx`（唯一表单实现）
  - `components/auth/AuthModalProvider.tsx`（全局弹窗宿主）
  - `components/AuthGate.tsx`（受保护页面跳转，不是表单）
- 没有其他重复的邮箱登录/注册表单。

### 2. `/login` 与 `/register` 改为渲染新版 UI

- 新增 `components/auth/AuthPage.tsx`：独立认证页外壳（背景、首页链接、语言切换、页脚）。
- `AuthModal` 新增 `inline` 与 `redirectTo` 属性：
  - `inline`：不通过 Portal，直接在页面中渲染同一套面板；
  - `redirectTo`：认证成功后执行 `router.refresh()` 再跳转。
- `app/login/page.tsx` / `app/register/page.tsx` 删除旧邮箱表单，分别渲染：
  - `<AuthPage mode="login" />`
  - `<AuthPage mode="signup" />`
- 因此 `/login`、`/register` 与全局弹窗共用 Google、Microsoft（COMING SOON）、邮箱密码、法律条款、错误提示同一份实现。

### 3. 注册成功跳转

- Supabase `signUp` 返回 `data.session` 时：
  ```ts
  router.refresh();
  router.push(redirectTo ?? "/dashboard");
  ```
- 旧 cookie / local fallback 注册成功时同样走该逻辑。
- `redirectTo` 默认 `/dashboard`；如果 URL 带 `?redirect=...`（例如 `AuthGate` 从受保护页面跳来），则回到原页面。
- 全局登录弹窗注册成功也会关闭弹窗、刷新并进入 `/dashboard`；普通登录仍保持原来的关闭并刷新当前页行为。
- 需要邮箱确认、`signUp` 未返回 session 时，不跳转，继续在弹窗内提示确认邮件并切到登录模式。

## 影响文件

- `app/login/page.tsx`
- `app/register/page.tsx`
- `components/auth/AuthPage.tsx`（新增）
- `components/auth/AuthModal.tsx`

## 验证

- `npx tsc --noEmit` 通过。
- `npx eslint components lib app` 通过。
- 浏览器实测：
  - `/login` 渲染「使用 Google 账号继续」「使用 Microsoft 账号继续 · 即将支持」以及邮箱登录表单；
  - `/register` 渲染同一套面板的注册模式；
  - 旧版独立邮箱表单不再出现。
- 注册跳转逻辑用浏览器 mock `/api/auth/register` 返回 `{ ok: true }` 验证：
  - 提交后 URL 从 `/register` 变为 `/dashboard`；
  - 未再跳回 `/login`。

## 备注 / 未决

- Supabase 开启邮箱确认时，注册不会立即返回 session，此时仍显示确认提示，属于预期行为。
- Google OAuth 仍由 Supabase provider 配置决定是否可用；未配置时表单会显示 `notConfigured` 错误。