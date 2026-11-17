// Shared OpenAI-compatible AI provider config.
//
// Primary env names: AI_API_KEY / AI_BASE_URL / AI_MODEL_NAME.
// Legacy names remain as fallbacks so existing DeepSeek setups keep working.

import fs from "node:fs";
import path from "node:path";

export type AiConfig = { key: string; baseUrl: string; model: string };

function readAgentKeyFile(): string | null {
  try {
    const key = fs
      .readFileSync(path.join(process.cwd(), ".agent-key"), "utf8")
      .trim();
    return key || null;
  } catch {
    return null;
  }
}

export function readAiConfig(): AiConfig | null {
  const key =
    process.env.AI_API_KEY?.trim() ||
    process.env.DASHSCOPE_API_KEY?.trim() ||
    process.env.DEEPSEEK_API_KEY?.trim() ||
    process.env.AGENT_API_KEY?.trim() ||
    readAgentKeyFile();

  if (!key) return null;

  const baseUrl = (
    process.env.AI_BASE_URL?.trim() ||
    process.env.AGENT_BASE_URL?.trim() ||
    "https://api.deepseek.com"
  ).replace(/\/+$/, "");

  const model =
    process.env.AI_MODEL_NAME?.trim() ||
    process.env.AGENT_MODEL?.trim() ||
    "deepseek-chat";

  return { key, baseUrl, model };
}

export function completionsUrl(baseUrl: string): string {
  return /\/chat\/completions$/.test(baseUrl)
    ? baseUrl
    : `${baseUrl}/chat/completions`;
}