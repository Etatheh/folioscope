# 登录方式：新增 GitHub OAuth，移除 Microsoft 占位

- 日期：2026-11-18
- 类型：feat / chore
- 影响面：全局登录弹窗、`/login`、`/register`、法律与隐私文案

## 动机

1. 用户要求新增 GitHub 登录，并与 Google 的样式和交互保持一致。
2. Microsoft 登录此前只是 COMING SOON 占位，没有实际 OAuth 流程，继续保留会造成误导。

## 改动

- `components/auth/AuthModal.tsx`
  - 新增 GitHub 官方 Mark 图标（单色，适配暗色按钮）。
  - 新增 `handleOAuth(provider)` 统一处理 OAuth，Google 与 GitHub 共用同一套样式、禁用态、错误处理和 `redirectTo`。
  - 新增 `handleGithub()`，调用 `supabase.auth.signInWithOAuth({ provider: "github" })`。
  - 删除 Microsoft 图标、`handleMicrosoft`、`microsoftSoon` 状态和 COMING SOON 提示块。
  - OAuth 进行中时，Google 与 GitHub 都会阻止关闭弹窗。
- `lib/i18n.ts`
  - 新增中英文 `github` 文案：
    - `使用 GitHub 账号继续`
    - `Continue with GitHub`
  - 删除 `microsoft`、`comingSoon`、`microsoftSoon` 文案和类型定义。
- `lib/legal.ts`、`app/terms/page.tsx`、`app/privacy/page.tsx`
  - 第三方登录提供商说明由 Microsoft 改为 GitHub。
- `components/auth/AuthPage.tsx`、`lib/auth.ts`、`lib/use-session.ts`
  - 注释从 Google/Microsoft 更新为 Google/GitHub。

## 影响文件

- `components/auth/AuthModal.tsx`
- `lib/i18n.ts`
- `lib/legal.ts`
- `app/terms/page.tsx`
- `app/privacy/page.tsx`
- `components/auth/AuthPage.tsx`
- `lib/auth.ts`
- `lib/use-session.ts`

## 验证

- `npx tsc --noEmit` 通过。
- `npx eslint components lib app` 通过。
- 全局搜索 `Microsoft` / `azure` / `comingSoon`：
  - 认证 UI 与法律文案中已无残留；
  - 仅剩股票代码 `MSFT` 的正常公司名称。

## 备注 / 未决

- 需要在 Supabase Dashboard → Authentication → Providers 中启用 GitHub，并配置 GitHub OAuth App：
  - Authorization callback URL：`https://<SUPABASE_PROJECT>.supabase.co/auth/v1/callback`
- 前端 OAuth 回调仍使用 `window.location.origin`；本地开发时记得把 `http://localhost:3000` 加入 Supabase 的 Redirect URLs，生产环境加入 `https://folioscope.live`。
- 若 GitHub provider 未启用，点击按钮会显示统一的第三方登录失败提示，邮箱登录仍可用。