# indepth AI 悬浮助手：真实流式对话与页面上下文同步

- 日期：2026-11-17
- 类型：feat
- 影响面：Dashboard、个股详情页、AI 助手、`/api/chat`、i18n、环境变量

## 动机
1. 右下角 `AI Assistant` 仍是旧的 fetch-JSON 单次回复，没有流式打字机效果。
2. 回答没有结合当前页面的美股指数、估值与定投方案，缺少“Live Context”。
3. 需要一份 OpenAI 兼容接口，可随时在 DeepSeek 与阿里云百炼 Qwen 之间切换。

## 改动

### 1. 新增 `/api/chat`（Node runtime，SSE 流式）
- 新增 `app/api/chat/route.ts`，`maxDuration = 60`。
- 环境变量：
  - 主变量：`AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL_NAME`。
  - 兼容旧变量：`DEEPSEEK_API_KEY` / `DASHSCOPE_API_KEY` / `AGENT_API_KEY` / `AGENT_BASE_URL` / `AGENT_MODEL`，以及本地 `.agent-key`。
  - 自动拼接 `/chat/completions`；若 `AI_BASE_URL` 已含该路径则直接使用。
- 鉴权：优先校验前端传来的 Supabase access token（`Authorization: Bearer` → `${SUPABASE_URL}/auth/v1/user`），再回退到原有 cookie session；未登录返回 401。
- 额度：复用 `getUsage` / `incrementUsage`，best-effort；额度存储异常不会阻断回答。通过 `X-Quota-Limit` / `X-Quota-Remaining` 返回剩余次数。
- 系统 Prompt：人格为 **indepth AI**，专业、客观的美股与资产配置分析助手；要求简洁、结构化 Markdown 要点，结合 live page context，末尾附合规提示。
- 若模型未输出合规提示，服务端自动补一行 `> 仅供参考，不构成投资建议。` / `> For reference only — not investment advice.`。
- 上游 SSE 解析 `choices[0].delta.content`；兼容 `text` / `message.content`；若供应商忽略 `stream:true`，自动退化为 JSON 一次性文本流。
- 客户端断开时通过 `AbortController` 取消上游请求；错误通过 `data: {"error": ...}` 或 502 JSON 返回。

### 2. 共享上下文与 Prompt 工具
- 新增 `lib/chat.ts`：
  - `ChatMessage` / `ChatMarketContext` / `ChatIndexContext` / `ChatDcaContext` / `ChatFocusedContext`。
  - `normalizeMessages`：限制 16 条、单条 4k、总计 18k 字符。
  - `normalizeMarketContext`：校验并裁剪指数、定投、当前标的字段。
  - `formatMarketContext`：把指数价格/涨跌/PE 分位、定投周期/金额/投入/期末/收益/XIRR、个股技术指标格式化为 Prompt 上下文。
  - `buildSystemPrompt` / `hasComplianceNote` / `COMPLIANCE_NOTE`。

### 3. 前端悬浮抽屉
- 新增 `components/ai/AiAssistantDrawer.tsx`：
  - 右下角 `AI Assistant` / `AI 助手` 渐变按钮，framer-motion 抽屉从右下平滑弹出，暗黑紫金毛玻璃 + 更不透明的渐变底。
  - 顶部 `indepth AI · Live Context` 状态徽章 + 脉冲绿点 + 同步说明；有额度时显示剩余次数。
  - 初始 3 个快捷提问胶囊：解读今日美股盘面 / 分析当前定投回测方案 / 标普500与纳指100配置建议（英文同步）。
  - 初始展示当前页面上下文 chips（指数涨跌、当前标的、定投标的/周期/金额）。
  - Markdown 渲染：加粗、列表、标题、引用、行内代码、安全链接；流式逐段输出 + 光标/停止按钮。
  - 未登录点击发送或快捷提问时调用 `openAuthModal({ mode: "login", lang })`；服务端 401 同样兜底打开登录弹窗。
  - 中英文文案跟随页面 `lang`。
- 新增 `components/ai/MarkdownText.tsx`：无第三方依赖的小型 Markdown 渲染器。
- 新增 `lib/ai-context-store.ts`：`useSyncExternalStore` 外部 store，避免把回测状态全部提升到页面层。

### 4. 页面实时上下文
- `components/DcaBacktestCard.tsx`：把当前定投标的、周期、月供、累计投入、期末市值、总收益、XIRR 发布到 AI store。免费用户只同步方案输入，不同步模糊后的回测结果。
- `app/dashboard/page.tsx`：层级获取 `getUsMarketSnapshot()`，构建指数上下文；把同一份快照传给 `UsStockPanel`，避免重复抓取。
- `components/UsStockPanel.tsx`：支持可选的 `snapshot` prop。
- `app/dashboard/markets/[symbol]/page.tsx`：把当前个股价格、涨跌、日内、PE/PB/分位、52 周、MA/RSI/MACD 作为 focused context 传入抽屉。
- 两个页面均用 `AiAssistantDrawer` 替换旧的 `AgentChat`；旧组件与 `/api/agent` 保留但不再挂载。

### 5. 文案与环境变量
- `lib/i18n.ts`：新增 `assistant` 中英文文案（按钮、Live Context、欢迎语、3 个快捷问题、发送/停止/新对话、额度、免责声明）。
- `.env.example`：新增 DeepSeek 与阿里云百炼 Qwen 的 `AI_*` 配置示例。

## 影响文件
- app/api/chat/route.ts（新增）
- components/ai/AiAssistantDrawer.tsx（新增）
- components/ai/MarkdownText.tsx（新增）
- lib/chat.ts（新增）
- lib/ai-context-store.ts（新增）
- components/DcaBacktestCard.tsx
- components/UsStockPanel.tsx
- app/dashboard/page.tsx
- app/dashboard/markets/[symbol]/page.tsx
- lib/i18n.ts
- .env.example
- docs/changes/2026-11-17-ai-assistant-drawer.md

## 验证
- `npx tsc --noEmit`、`npx eslint components lib app`、`npx next build` 通过。
- 用本地 mock OpenAI 兼容服务验证：
  - SSE `Content-Type: text/event-stream`，多个 `delta` 事件 + `done`，前端逐段渲染。
  - Markdown `strong` 3 处、列表 5 项，合规提示自动补全。
  - 后端收到的 system prompt 包含 indepth AI 人格、美股指数、定投 `$800`、累计投入、期末市值、总收益、XIRR 和对比基准。
  - 未登录请求返回 401；Supabase access token 通过 `/auth/v1/user` 校验后返回 200 SSE。
- 375×812 实测：抽屉 `left=12 / right=363`，无横向溢出；中英文快捷提问、输入框、发送按钮完整。
- 详情页 AAPL 上下文请求包含 `AAPL` 与实时价格，页面无 console error。

## 备注 / 未决
- 需要在部署环境配置 `AI_API_KEY` 等变量，否则 `/api/chat` 会返回明确的未配置提示。
- 旧 `/api/agent` 与 `AgentChat` 保留用于兼容，当前页面不再使用。
- 额度存储在 Supabase 未初始化时自动放行（best-effort），不会阻断对话。
- Microsoft 登录仍为 Coming soon；与本次 AI 对话无关。