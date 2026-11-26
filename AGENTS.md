<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — AI 协作交接准则

> 本文件是新 Session 的强制入口。任何 AI 在开始修改本项目代码前，必须完整阅读并遵守以下规则。
> 配套文件：`CHANGELOG.md`（版本变更交接日志，倒序时间线，最新记录在最上面）。

## 0. 项目速览

- 应用：Next.js App Router 项目，项目根目录即本目录（`personal/`）。
- 主要目录：
  - `app/`：路由与 API（`app/api/**/route.ts`）
  - `components/`：UI、图表、AI 助手、权限相关组件
  - `lib/`：`access.ts` 权限单一来源、`server/` 服务端鉴权、`i18n.ts` 文案
  - `supabase/`：表结构与 RLS 策略
  - `content/`：Journey 文章
  - `public/_preview/`：视觉回归参考截图
- 历史变更细节见 `CHANGELOG.md`，每条记录固定 4 项结构。

## 1. 接手必读（强制）

每次在**新的会话**开始修改代码前，必须先阅读：

1. 本文件 `AGENTS.md` 全文。
2. `CHANGELOG.md` 的**最近 3 条记录**（文件顶部即最新）。

目的是在动手前了解当前架构、**视觉保留约定**（深色主题、青绿色／紫色交互折线质感等）以及**接口权限规则**，避免重复踩坑或覆盖既有约定。

## 2. 修改前备份（强制）

在进行**大幅度排版重构**或**核心组件改动**前，若工作区干净（`git status --porcelain` 无输出），先执行一次 `git commit`，保存当前可运行状态快照，再开始修改。

- 若工作区已有未提交改动，不要顺手 `git add -A` 把它们卷入快照；先与用户确认如何处理。
- 只提交可运行、通过类型检查的快照，确保出问题时可回滚。

## 3. 部署前强制登记（强制）

每次准备 `git push` 部署前，必须先更新 `CHANGELOG.md`，简明清晰地记录本次变更：

- 采用**倒序时间线**，最新记录写在最上面。
- 每条记录固定包含 4 项：
  1. **日期与版本主题**
  2. **核心改动内容**（新增／合并／删除了哪些功能）
  3. **涉及的核心文件路径**（方便下一个 AI 快速定位）
  4. **架构与设计约定（Do Not Break）**（明确哪些样式、白名单或鉴权逻辑绝对不能被覆盖破坏）
- 不要修改或删除历史条目；新变更只在顶部新增记录。

## 4. 不可破坏约定速览（细节见 CHANGELOG.md）

- **视觉**：深色主题（`--background: #05070d`、蓝紫玻璃拟态 `.glass` / `.glass-panel`）、5px 暗紫玻璃滚动条（`rgba(168,85,247,0.22)`，hover `0.5`）；图表为 SVG 交互折线——霓虹发光滤镜（`feGaussianBlur`）、渐变面积、金色虚线本金线（`#fbbf24`）、流光高光（`.dca-flow`）、终点呼吸脉冲（`.dca-pulse`）、十字准星 + 磨砂 tooltip，主色紫色 `#a78bfa` 或青绿 emerald `#34d399`；`prefers-reduced-motion` 降级必须保留。
- **权限**：Pro 权限唯一判定为 `isProTier()`（`tier === "pro" || tier === "admin"`），admin 享无限额度；所有付费 API 必须在服务端校验，不能只靠前端隐藏；免费用户仅各市场精选白名单（默认 4 只）+ `INDEX_SYMBOLS` 指数始终可见；`profiles` 浏览器端只读，tier 写入只走 service-role 的 `/api/account/profile`。
- **文案**：语言偏好用 `lang` cookie 记忆；英文模式页面不得出现 CJK 字符；A 股面板仅在中文模式显示。
- **框架**：保留本文件顶部 `<!-- BEGIN:nextjs-agent-rules -->` / `<!-- END:nextjs-agent-rules -->` 注释块（Next.js 工具链依赖）；写 Next.js 代码前先查阅 `node_modules/next/dist/docs/` 中的对应指南并留意弃用提示。

## 5. 接到任务时的最小检查清单

### 模块定位与检查范围

- 功能入口、依赖和按需验证范围见 [`docs/architecture-map.md`](docs/architecture-map.md)。后续局部任务先查该索引，再确认目标文件当前引用；不默认重新扫描整个项目。
- “回测模块”默认指 `/dashboard?view=simulator` 的 `components/simulator/SimulatorWorkbench.tsx` 链路；不要误改未挂载的旧模拟组件。
- 检查以目标模块及受影响的上下游为范围；修改共享行情、权限、套餐、语言或全局样式时必须扩大到相关消费者。框架/接口变动及发布仍执行相应类型、构建和运行验证。
- 若修改改变了功能入口或依赖，同步维护架构索引。

- [ ] 已读 `AGENTS.md` + `CHANGELOG.md` 最近 3 条记录
- [ ] 大改前工作区干净且已 commit 快照（或已与用户确认如何处理未提交改动）
- [ ] 改动遵守上述 Do Not Break 约定
- [ ] `git push` 前已在 `CHANGELOG.md` 顶部新增记录
- [ ] 视改动范围运行 `npx tsc --noEmit`、`npx eslint components lib app`、`npx next build`
