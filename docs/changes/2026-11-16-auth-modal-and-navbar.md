# 认证弹窗、双语合规条款与移动端顶部导航修复

- 日期：2026-11-16
- 类型：feat + fix + style
- 影响面：全局布局、Dashboard 顶部栏、UserMenu、Pro 锁定卡片、语言切换、i18n

## 动机
1. 顶部语言切换仍是 `中文 / EN` 双胶囊；375px 下语言、`升级 Pro`、`♡`、`登录`会被挤压换行。
2. 登录/注册仍跳到独立页面，缺少统一的第三方登录入口与双语合规声明。
3. 英文界面中 `U.S. Markets` 旁仍硬编码显示中文副标题 `美股行情`，不是纯英文展示。
4. 登录后顶部只有免费版徽章和退出按钮，没有头像、账户信息与下拉菜单。

## 改动

### 1. 顶部导航响应式（375px 单行）
- `components/LangToggle.tsx`：双胶囊 → 单个 `🌐 EN` / `🌐 中` 按钮，`whitespace-nowrap`；点击写 `lang` cookie 并跳转另一语言。
- `app/dashboard/page.tsx`：头部改为标题行 + 控件行；移动端控件 `flex w-full flex-nowrap items-center justify-between`，桌面端恢复右对齐。语言、升级、♡、登录/头像全部 `shrink-0 whitespace-nowrap`。
- `components/ui/ProUpgradeButton.tsx`：三个 variant 均加 `whitespace-nowrap`，箭头 `shrink-0`。

### 2. 双语纯净展示
- `components/UsStockPanel.tsx`：英文只显示 `U.S. Markets`；中文显示 `美股行情` + `U.S. Markets` 副标题。
- `components/MarketBoard.tsx`：`titleEn` 副标题只在中文模式渲染。
- `app/dashboard/markets/[symbol]/page.tsx`：metadata 去掉硬编码中文。
- `components/PriceChart.tsx`：图表 `aria-label` 按语言切换。

### 3. AuthModal（全局单实例）
- 新增 `components/auth/AuthModal.tsx`：
  - 顶部主推 Google（标准四色 SVG）与 Microsoft（四色方块 + Coming soon 轻提示）。
  - Google 调用 `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } })`。
  - Microsoft 预留 `azure` 调用，开关 `MICROSOFT_OAUTH_ENABLED`。
  - `or continue with email` / `或使用邮箱登录` 分割线 + 邮箱密码登录/注册切换。
  - 底部可点击合规声明，弹窗内平滑切到条款视图；条款页有 `返回登录`。
  - 支持 Escape/遮罩关闭、焦点陷阱、滚动锁定、reduced motion。
- 新增 `components/auth/AuthModalProvider.tsx`：在 `app/layout.tsx` 挂载一次，任意客户端组件用 `openAuthModal({ mode, lang })` 调起；每次打开用 nonce 重挂载，保证表单干净。
- 新增 `lib/legal.ts`：中英双语《服务条款》《隐私政策》《金融免责声明》完整文本；明确历史回测、定投、模拟与 XIRR 仅为假设性参考，不构成投资建议。

### 4. Supabase 会话联动
- 新增 `lib/supabase/client.ts`：浏览器端懒加载单例；优先读 `NEXT_PUBLIC_*`，否则请求 `/api/auth/config`。
- 新增 `app/api/auth/config/route.ts`：只返回 URL 与 publishable/anon key（不暴露 secret）。
- `lib/use-session.ts`：新增 Supabase 会话源，监听 `onAuthStateChange`；Supabase 会话优先，未配置时回退原有 cookie/localStorage 登录。
- `lib/auth.ts`：`SessionUser` 增加 `avatarUrl` / `provider`。
- `components/UserMenu.tsx`：未登录点击直接开登录弹窗；登录后显示 Google 头像（`user_metadata.avatar_url`，失败回退首字母）、用户名/邮箱、`FREE`/`PRO`/`ADMIN` 徽章，下拉含 `Account & Plan` 与 `Sign out`；退出同时清理 Supabase 与旧会话。
- `components/Navbar.tsx`：桌面与移动菜单的 Log in / Get started 改为打开 AuthModal。
- `components/ui/UnlockCtaButton.tsx`：匿名点击解锁卡片（🔒 + PRO FEATURE）打开注册弹窗；免费用户仍打开 Pro 对比弹窗。
- `components/ui/UpgradeModal.tsx`：未登录 CTA 改为打开 AuthModal。
- `lib/i18n.ts`：新增 `auth` 文案与 `user` 菜单文案；`boards.asia.titleEn` 修正为英文。
- `app/globals.css`：新增 `.auth-legal-scroll` 细滚动条样式。

## 影响文件
- components/auth/AuthModal.tsx（新增）
- components/auth/AuthModalProvider.tsx（新增）
- components/LangToggle.tsx
- components/UserMenu.tsx
- components/Navbar.tsx
- components/UsStockPanel.tsx
- components/MarketBoard.tsx
- components/PriceChart.tsx
- components/ui/ProUpgradeButton.tsx
- components/ui/UnlockCtaButton.tsx
- components/ui/UpgradeModal.tsx
- lib/legal.ts（新增）
- lib/supabase/client.ts（新增）
- lib/auth.ts
- lib/use-session.ts
- lib/i18n.ts
- app/layout.tsx
- app/dashboard/page.tsx
- app/dashboard/markets/[symbol]/page.tsx
- app/api/auth/config/route.ts（新增）
- app/globals.css
- package.json / package-lock.json（新增 @supabase/supabase-js）
- .env.example

## 验证
- `npx tsc --noEmit`、`npx eslint components lib app`、`npx next build` 全部通过。
- Chrome CDP（375×812）实测：
  - 头部 `🌐 中 / 升级 Pro / ♡ / 登录` 与 `🌐 EN / Upgrade to Pro / ♡ / Log in` 均同一行，`scrollWidth <= innerWidth`，无横向溢出。
  - 英文模式 `document.body.innerText` 无任何 CJK 字符；`U.S. Markets` 正常，`美股行情` 不再出现。
  - 点击 `登录` / `Log in` 打开对应语言弹窗；Google/Microsoft/分割线/邮箱表单/底部合规声明齐全。
  - 点击《金融免责声明》平滑切换条款视图，包含回测、XIRR、不构成投资建议与返回按钮。
  - 点击解锁卡片（🔒 / PRO FEATURE）打开注册弹窗；Pro 锁定卡的 `升级 Pro` 对匿名用户打开登录弹窗。
  - 错误密码请求命中 Supabase `/auth/v1/token`，返回本地化 `Incorrect email or password.`。
  - 模拟已登录 free 用户：顶部显示头像 + 姓名 + FREE，下拉含邮箱、`账户与订阅`、`退出登录`。
- 浏览器 console 无 error/warning；登录页语言切换写 cookie 并跳转 `?lang=zh`。

## 备注 / 未决
- Microsoft 登录按钮目前只提示 Coming soon，`azure` OAuth 调用已封装，打开开关并配置 provider 即可启用。
- Supabase 邮箱/Google 会话只影响前端顶部状态；服务端 Pro 权限仍由原 cookie 会话与 `users` 表决定，二者同步需后续接入 access-token 校验。
- 首页营销页仍为英文硬编码，未纳入本次 i18n 范围。