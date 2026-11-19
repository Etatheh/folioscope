import Link from "next/link";
import { cookies } from "next/headers";
import BackgroundEffects from "@/components/BackgroundEffects";
import ClearErrorParam from "@/components/ClearErrorParam";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import LegalInlineLinks from "@/components/legal/LegalInlineLinks";
import { Icon, type IconName } from "@/components/ui/Icon";
import { parseLang } from "@/lib/i18n";
import { LANG_COOKIE } from "@/lib/lang-pref";
import { PLANS } from "@/lib/plans";
import { SITE_DESCRIPTION } from "@/lib/site";
import { TiltPreview, FeatureRail, ResearchStory } from "@/components/landing/LandingMotion";
import { Reveal, StaggerGroup } from "@/components/ui/Reveal";
import styles from "@/components/landing/landing.module.css";

export const metadata = {
  title: { absolute: "FolioScope — Quantitative Market Research" },
  description: SITE_DESCRIPTION,
};

const features: { icon: IconName; en: [string, string]; zh: [string, string] }[] = [
  { icon: "us", en: ["US markets, front and center", "Real-time US indices and stocks — Dow, Nasdaq, S&P 500 and Nasdaq 100 — with daily candlesticks and technical indicators."], zh: ["美股行情，尽在眼前", "观察道琼斯、纳斯达克、标普 500 与纳斯达克 100 等美股指数和个股，结合日 K 线与技术指标。"] },
  { icon: "backtest", en: ["Backtest your perspective", "Compare portfolio and DCA strategies across up to 10 years of historical daily data, benchmarked against the S&P 500."], zh: ["历史回测与定投模拟", "配置股票与权重，使用长达 10 年的历史日线回测，对照标普 500，比较一次性投入与定投策略。"] },
  { icon: "ai", en: ["FolioScope AI research", "Explore financial reports, market summaries and valuation breakdowns with an AI research analyst."], zh: ["FolioScope AI 财报解读", "借助 AI 获取市场摘要、估值拆解、财报重点与金融研究洞察。"] },
  { icon: "globe", en: ["Multi-market macro view", "Track European and Asia-Pacific indices alongside U.S. equities in one unified workspace."], zh: ["多市场宏观视野", "在统一的工作空间，追踪美股、欧洲和亚太市场指数。"] },
  { icon: "indicators", en: ["Indicators & valuations", "Spot overbought levels and historical valuation extremes at a glance."], zh: ["指标与估值", "直观观察超买水平与历史估值极值。"] },
  { icon: "watchlist", en: ["Cloud Watchlist Sync", "Save custom stock pools and backtest presets in the cloud, synced seamlessly across devices."], zh: ["云端自选同步", "将自选股票池和回测预设保存在云端，跨设备同步研究进度。"] },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  const { lang: rawLang } = await searchParams;
  const store = await cookies();
  const lang = parseLang(rawLang ?? store.get(LANG_COOKIE)?.value);
  const zh = lang === "zh";
  return <>
    <ClearErrorParam />
    <BackgroundEffects />
    <Navbar lang={lang} />
    <main className={styles.landing}>
      <StaggerGroup as="section" className={styles.hero} scroll={false}>
        <Reveal inherit as="p" className={styles.eyebrow}>{zh ? "为更清晰的投资研究而构建" : "A clearer perspective on your portfolio"}</Reveal>
        <Reveal inherit as="h1" className={styles.headline}>{zh ? "全球市场，" : "Global markets,"}<br /><span className="gradient-text">{zh ? "清晰洞见。" : "in focus."}</span></Reveal>
        <Reveal inherit as="p" className={styles.heroCopy}>{zh ? "多市场行情、组合与定投回测、AI 财报分析。将全球视野与深度研究，汇聚在同一个工作空间。" : "Multi-market intelligence. Portfolio and DCA backtesting. AI-powered financial research. One workspace to connect the bigger picture with the finer details."}</Reveal>
        <Reveal inherit className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className="btn-primary rounded-full px-8 py-3.5 text-sm font-semibold text-white">{zh ? "进入看板" : "Launch Dashboard"}</Link>
          <Link href="/register" className="btn-secondary rounded-full px-8 py-3.5 text-sm font-semibold text-white">{zh ? "免费开始" : "Get started — it's free"}</Link>
        </Reveal>
        <Reveal inherit as="p" className="mt-5 text-sm text-slate-500">{zh ? "无需信用卡 · 仅供量化研究，不构成投资建议" : "No credit card required. Built for research, not investment advice."}</Reveal>
      </StaggerGroup>
      <TiltPreview lang={lang} />
      <div className={styles.principles}><span>US · Europe · Asia-Pacific</span><span>{zh ? "组合与定投回测" : "Portfolio & DCA backtests"}</span><span>{zh ? "AI 财报洞察" : "AI financial insights"}</span></div>
      <section id="features" className={styles.section}>
        <StaggerGroup>
          <Reveal inherit as="p" className="text-sm tracking-widest text-violet-300">{zh ? "你的研究工具箱" : "THE RESEARCH TOOLKIT"}</Reveal>
          <Reveal inherit as="h2" className={styles.sectionTitle}>{zh ? "从市场全景，到每一个细节。" : "The whole market. The finer details."}</Reveal>
          <Reveal inherit>
          <FeatureRail lang={lang}>{features.map((f, i) => <article key={f.icon} className={styles.feature}>
            <span className={styles.featureIcon}><Icon name={f.icon} className="h-6 w-6" /></span>
            <div className={styles.featureArt} aria-hidden="true">{[35, 55, 43, 72, 60, 88, 77, 100].map((height, j) => <span key={j} style={{ height: `${Math.max(20, height - (i % 3) * (j % 2) * 12)}%` }} />)}</div>
            <h3 className="text-xl font-semibold tracking-tight text-white">{f[lang][0]}</h3>
            <p className="mt-3 text-base leading-7 text-slate-400">{f[lang][1]}</p>
          </article>)}</FeatureRail>
          </Reveal>
        </StaggerGroup>
      </section>
      <section className={styles.section} aria-labelledby="research-heading">
        <StaggerGroup><Reveal inherit as="p" className="text-sm tracking-widest text-violet-300">{zh ? "从观察，到理解" : "FROM OBSERVATION TO UNDERSTANDING"}</Reveal>
          <Reveal inherit as="h2" id="research-heading" className={styles.sectionTitle}>{zh ? "为你的每一步研究而设计。" : "A natural flow for your research."}</Reveal></StaggerGroup>
        <ResearchStory lang={lang} />
      </section>
      <section id="pricing" className={styles.section}>
        <StaggerGroup>
          <Reveal inherit as="h2" className="text-center text-3xl font-semibold tracking-tight sm:text-4xl"><span className="gradient-text">{zh ? "选择适合你的研究计划" : "More perspective. At your pace."}</span></Reveal>
          <Reveal inherit as="p" className="mt-4 text-center text-slate-400">{zh ? "免费开始，按需升级。" : "Start free. Upgrade whenever you need more."}</Reveal>
          <StaggerGroup delay={0.46} className="mt-12 grid gap-5 md:grid-cols-2">{PLANS.map(plan => <Reveal inherit as="article" key={plan.id} className={`glass flex flex-col rounded-2xl p-8 ${plan.highlight ? "border-purple-400/40 ring-1 ring-purple-400/20" : ""}`}>
            <div className="flex items-center justify-between"><h3 className="text-lg font-semibold text-white">{plan.name}</h3>{plan.highlight && <span className="rounded-full bg-purple-400/10 px-3 py-1 text-xs text-purple-200">{zh ? "推荐" : "Recommended"}</span>}</div>
            <p className="mt-5 text-4xl font-semibold text-white">{plan.price}<span className="text-sm font-normal text-slate-500"> {plan.period}</span></p>
            <p className="mt-2 text-sm text-slate-400">{plan.tagline}</p>
            <ul className="mt-7 mb-8 space-y-3 text-sm text-slate-400">{plan.features.map(f => <li key={f} className="flex gap-3"><span className="text-emerald-400" aria-hidden="true">✓</span>{f}</li>)}</ul>
            <Link href={plan.id === "free" ? "/register" : "/pricing"} className={`mt-auto block rounded-full py-3 text-center text-sm font-medium text-white ${plan.highlight ? "btn-primary" : "btn-secondary"}`}>{plan.id === "free" ? (zh ? "免费开始" : "Start for free") : (zh ? "了解 Pro" : "See Pro details")}</Link>
            <LegalInlineLinks className="mt-3" />
          </Reveal>)}</StaggerGroup>
        </StaggerGroup>
      </section>
    </main>
    <SiteFooter />
  </>;
}
