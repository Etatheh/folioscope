# 全局暗紫玻璃滚动条

- 日期：2026-11-17
- 类型：style
- 影响面：全站滚动区域、indepth AI 抽屉、AuthModal 条款、AccountModal

## 动机
浏览器默认滚动条在暗黑紫金玻璃界面里非常突兀，尤其是 indepth AI 对话列表右侧的灰色宽滚动条。需要统一成 5px 的半透明暗紫色细滚动条。

## 改动
- `app/globals.css`：
  - `html, body, *` 设置 Firefox：`scrollbar-width: thin`、`scrollbar-color: rgba(168, 85, 247, 0.22) transparent`。
  - 全局 `::-webkit-scrollbar` / `*::-webkit-scrollbar`：宽高 `5px`。
  - 轨道与角落 `background: transparent`。
  - 滑块 `border-radius: 9999px`、`background: rgba(168, 85, 247, 0.22)`。
  - 滑块 hover `rgba(168, 85, 247, 0.5)`。
  - 删除 `.auth-legal-scroll` 原有 6px / 0.3 的独立滚动条样式，保留 `overscroll-behavior: contain`，统一走全局规则。

## 影响文件
- app/globals.css
- docs/changes/2026-11-17-global-scrollbars.md

## 验证
- `npx tsc --noEmit`、`npx eslint components lib app`、`npx next build` 通过。
- Chrome CDP 实测：
  - 页面样式表已加载 `::-webkit-scrollbar { width: 5px; height: 5px; }`、透明 track/corner、`rgba(168, 85, 247, 0.22)` thumb 与 `0.5` hover。
  - 强制让 indepth AI 消息列表滚动（scrollHeight 2096 / clientHeight 463），右侧出现 5px 紫色细滚动条，与毛玻璃面板融合。
- Firefox 使用 `scrollbar-width: thin` + `scrollbar-color` 回退。

## 备注 / 未决
- Firefox 不支持 `::-webkit-scrollbar-thumb:hover`，hover 颜色仅 Chromium/Safari 生效；Firefox 保持 0.22 的 `scrollbar-color`。
- 滚动条宽度固定 5px，不会改变现有布局断点。