"use client";

import { useState } from "react";

import { dict, type Lang } from "@/lib/i18n";
import { hasFullDashboardAccess, type ViewerPlan } from "@/lib/access";
import { apiFetch } from "@/lib/client-api";
import { useViewerPlan } from "@/lib/use-profile";
import ProBadge from "./ui/ProBadge";
import ProUpgradeButton from "./ui/ProUpgradeButton";

type Usage = { used: number; limit: number; remaining: number };

type AgentResponse = {
  ok?: boolean;
  reply?: string;
  error?: string;
  usage?: Usage;
};

/**
 * Pro-gated "AI market summary" card.
 *
 * Pro users ask the existing /api/agent route for a short briefing; everyone
 * else sees a frosted, blurred teaser with the upgrade dialog behind the badge.
 */
export default function AiSummaryCard({
  lang,
  plan,
}: {
  lang: Lang;
  plan: ViewerPlan;
}) {
  const t = dict[lang].aiSummary;
  const effectivePlan = useViewerPlan(plan);
  const hasFullAccess = hasFullDashboardAccess(effectivePlan);
  const [summary, setSummary] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await apiFetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang,
          messages: [{ role: "user", content: t.prompt }],
        }),
      });
      const data = (await response.json()) as AgentResponse;
      if (data.usage) setUsage(data.usage);
      if (!response.ok || !data.ok || !data.reply) {
        setError(data.error ?? t.error);
        return;
      }
      setSummary(data.reply);
      setGeneratedAt(
        new Date().toLocaleTimeString(lang === "zh" ? "zh-CN" : "en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="data-card flex h-full flex-col rounded-2xl p-5 sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">
            {t.title}
            <span className="ml-2 align-middle text-xs font-normal text-slate-500">
              {t.subtitle}
            </span>
          </h2>
        </div>
        <ProBadge title={dict[lang].pro.badgeTip} />
      </header>

      {!hasFullAccess && (
        <div className="relative mt-4 flex-1 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p
            aria-hidden
            className="select-none text-sm leading-relaxed text-slate-400 blur-[5px]"
          >
            {t.lockedPreview}
          </p>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#070b13]/55 p-4 text-center backdrop-blur-[2px]">
            <span className="text-lg" aria-hidden>
              🔒
            </span>
            <p className="max-w-xs text-xs leading-relaxed text-slate-400">{t.locked}</p>
            <ProUpgradeButton
              lang={lang}
              variant="secondary"
              label={dict[lang].pro.upgrade}
              source="ai-summary"
              className="mt-1"
            />
          </div>
        </div>
      )}

      {hasFullAccess && (
        <div className="mt-4 flex flex-1 flex-col">
          {busy && (
            <div className="space-y-2.5" aria-live="polite" aria-busy="true">
              <p className="text-xs text-slate-500">{t.loading}</p>
              <div className="h-3 w-11/12 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-full animate-pulse rounded bg-white/[0.07]" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-white/[0.07]" />
            </div>
          )}

          {!busy && summary && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
              {summary}
            </p>
          )}

          {!busy && !summary && (
            <p className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm leading-relaxed text-slate-500">
              {t.empty}
            </p>
          )}

          {error && !busy && (
            <p className="mt-2 text-[11px] text-rose-300">{error}</p>
          )}

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
            <p className="text-[11px] text-slate-600">
              {generatedAt ? `${t.updated} ${generatedAt}` : ""}
              {usage ? ` · ${t.quota(usage.remaining, usage.limit)}` : ""}
            </p>
            <button
              type="button"
              onClick={generate}
              disabled={busy}
              className="rounded-lg border border-purple-400/25 bg-purple-500/10 px-3 py-1.5 text-[11px] font-medium text-purple-200 transition hover:border-purple-400/45 hover:text-white disabled:opacity-50"
            >
              {summary ? t.regenerate : t.generate}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
