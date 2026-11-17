# 账号管理弹窗：资料编辑、套餐额度与安全销号

- 日期：2026-11-17
- 类型：feat
- 影响面：用户下拉菜单、Supabase Auth、profiles 表、AI 额度、全局 Toast

## 动机
1. 顶部用户下拉只有「账户与订阅」跳转，没有真正的账号管理界面。
2. 用户无法修改显示昵称；昵称也没有同步到 Supabase `profiles`。
3. 套餐、AI 剩余额度和删除账号缺少统一入口，销号没有二次确认与防误触。

## 改动

### 1. 入口与共享组件
- `components/UserMenu.tsx`：下拉菜单项改为 `Account Settings` / `账号管理`，点击打开 `AccountModal`；每次打开使用 nonce 重挂载，保证表单与用户状态最新。
- 新增 `components/ui/UserAvatar.tsx`：Google 头像 / 首字母渐变头像，`UserMenu` 与账号弹窗共用。
- 新增 `components/ui/ToastHost.tsx`：全局 `showToast()` 事件 + 毛玻璃 Toast，挂在根布局，销号后即使 UserMenu 卸载也能显示提示。
- `app/layout.tsx`：挂载 `<ToastHost />`。

### 2. AccountModal（`components/account/AccountModal.tsx`）
- 暗黑紫金毛玻璃弹窗，支持 Escape / 遮罩关闭、焦点陷阱、滚动锁定、reduced motion。
- **Profile**：
  - Google 头像、只读邮箱 + Google / Email 徽章。
  - 昵称输入（2–32 字符），通过新增的 `POST /api/account/profile` 使用 service-role 写入 Supabase `profiles.full_name`，再调用 `supabase.auth.updateUser({ data: { full_name } })` 同步顶部用户名。
  - 保存成功显示「资料已更新」。
  - 线上 `profiles` 仅开放 select RLS，浏览器端 UPDATE 会返回 0 行；因此写入放在服务端，避免要求用户手动补 policy。
- **Plan & AI Credits**：
  - `FREE` / `PRO` 徽章。
  - AI Assistant 剩余次数进度条，数据来自新增的 `GET /api/chat`（Supabase Bearer 或 cookie 鉴权）；失败时回退 `profiles.ai_credits` / 套餐上限。
  - 免费用户显示 `Upgrade to Pro` / `升级 Pro`（跳转 `/pricing`）；Pro 显示已激活。
- **Danger Zone**：
  - 暗红警示边框 + 删除账号按钮。
  - 二次确认面板要求手动输入大写 `DELETE` 才激活「永久删除账号」。
  - 确认后调用 `await supabase.rpc("delete_user_account")`，成功后 `await supabase.auth.signOut()`，清除旧 cookie/local 会话，关闭弹窗，`router.push("/")` 并弹出 Toast「账号及所有数据已永久删除」。
  - 非 Supabase 登录（仅旧 cookie/local 账号）会提示需要 Supabase 会话。

### 3. 后端与数据库
- `app/api/chat/route.ts`：新增 `GET` handler，返回当前用户的 `{ tier, used, limit, remaining, unlimited }`；复用 Bearer/cookie 鉴权与 `getUsage`。
- 新增 `lib/server/request-user.ts`：统一 Supabase Bearer / cookie 会话解析，供 `/api/chat` 与 `/api/account/profile` 复用。
- 新增 `app/api/account/profile/route.ts`：校验 Supabase 会话与昵称长度，使用 service-role 写入 `profiles`；若无行则插入；返回标准化结果。
- 新增 `supabase/profiles.sql`，用于新环境复现：
  - `profiles` 表（`id/email/full_name/avatar_url/tier/ai_credits/created_at`）。
  - 仅本人可 select/insert/update 的 RLS。
  - `delete_user_account()` security definer RPC，删除 `auth.users` 并级联 `profiles`。
  - 当前线上项目已存在该表与 RPC，本文件仅作版本管理。
- `lib/auth.ts` / `lib/use-session.ts`：`SessionUser` 增加 `id`，Supabase 与 cookie 用户都映射 id，供 `profiles` 定位。
- `lib/i18n.ts`：新增 `account` 中英文文案；下拉项改为账号管理。

## 影响文件
- components/account/AccountModal.tsx（新增）
- components/ui/UserAvatar.tsx（新增）
- components/ui/ToastHost.tsx（新增）
- components/UserMenu.tsx
- app/layout.tsx
- app/api/chat/route.ts
- app/api/account/profile/route.ts（新增）
- lib/server/request-user.ts（新增）
- lib/auth.ts
- lib/use-session.ts
- lib/i18n.ts
- supabase/profiles.sql（新增）
- docs/changes/2026-11-17-account-modal.md

## 验证
- `npx tsc --noEmit`、`npx eslint components lib app`、`npx next build` 通过。
- Supabase Auth 测试账号 UI 实测：
  - 下拉「账号管理」打开弹窗；头像/邮箱/Google 徽章、`FREE`、`5 / 5` 进度条、危险区域全部渲染。
  - 昵称保存后 `profiles.full_name` 与顶部用户名同步为 `Updated Tester`，界面显示「资料已更新」。
  - `delete`（小写）时确认按钮禁用，`DELETE` 时启用。
  - 确认删除后 `auth.users` 返回 404、`profiles` 行清空、自动退出，Toast 显示「账号及所有数据已永久删除」；页面停留在当前 Dashboard，语言不跳动。
  - `GET /api/chat` 额度读取正常（`5 / 5`）。
- 375px 宽度下弹窗内部滚动，无横向溢出。

## 备注 / 未决
- Supabase `profiles` 使用现有字段 `full_name`（而非 `nickname`）、`tier`、`ai_credits`。
- 线上 `profiles` 只有 select RLS；昵称写入改走 `/api/account/profile` 的 service-role，因此无需用户先补 update policy。`supabase/profiles.sql` 仍包含完整策略，供新环境使用。
- 账号资料修改与销号要求 Supabase 会话；旧 cookie/local 账号可查看套餐额度，但会提示改用 Supabase 登录。
- Upgrade 按钮跳转 `/pricing`，实际支付链路由现有 Lemon Squeezy 流程处理。