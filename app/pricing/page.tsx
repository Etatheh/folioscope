import { getRequestLang } from "@/lib/server/lang";
import { PLANS_CONFIG } from "@/config/plans";
import Link from "next/link";
import BackgroundEffects from "@/components/BackgroundEffects";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import PricingPlans from "@/components/pricing/PricingPlans";

export const metadata = {
  title: "Pricing",
  description:
    "Compare FolioScope Free and Pro plans. Prices in USD, with full-market search, multi-market data and AI financial report summaries.",
};

const faqs = [
  {
    q: "How do I pay for Pro?",
    a: "Pro subscriptions are processed by Creem, our authorized Merchant of Record. “Upgrade to Pro” opens the secure Creem hosted checkout, where you can pay by card. You are returned to FolioScope once payment completes.",
  },
  {
    q: "Where does the market data come from?",
    a: "Market quotes, historical prices, and valuation metrics are aggregated from established third-party financial data providers. Depending on the exchange and asset class, quotes may be delayed or reflect end-of-day pricing. All market data is provided strictly for informational and backtesting purposes only and does not constitute financial advice.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from Account Settings → Manage Subscription. You keep Pro access until the end of your current paid billing period. First-time purchases also include a 7-day refund window; see the Refund Policy for details.",
  },
];

export default async function PricingPage() {
  const lang = await getRequestLang();
  const zh = lang === "zh";
  const localizedFaqs = zh ? [
    { q: "如何订阅 Pro？", a: "Pro 订阅由我们的授权名义商户 Creem 处理。点击升级 Pro 后进入安全结算页面，可使用银行卡支付，完成后返回 FolioScope。" },
    { q: "市场数据来自哪里？", a: "报价、历史价格和估值指标由第三方金融数据提供商汇总。根据交易所和资产类别，行情可能延迟或使用收盘价。所有数据仅供信息参考和历史回测，不构成投资建议。" },
    { q: "可以随时取消吗？", a: "可以。在账户设置中选择管理订阅即可取消；Pro 权限保留至当前已付费周期结束。首次购买另享 7 天退款窗口，详情请参阅退款政策。" },
  ] : faqs;
  return (
    <>
      <BackgroundEffects />
      <Navbar />
      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-28 pt-36">
        <div className="text-center">
          <h1 className="text-4xl font-bold sm:text-5xl">
            {zh ? "简单、" : "Simple, "}<span className="gradient-text">{zh ? "透明的定价" : "honest pricing"}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            {zh ? `从 ${PLANS_CONFIG.free.limits.backtestSymbols?.length} 个精选标的和基础回测免费开始。升级 Pro，解锁全美股搜索、美国、欧洲、日本和韩国市场覆盖及 AI 财报摘要。` : `Start free with ${PLANS_CONFIG.free.limits.backtestSymbols?.length} curated stocks and core backtesting. Upgrade to Pro for full U.S. equity search, multi-market coverage across the U.S., Europe, Japan and South Korea, and AI financial report summaries.`}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            {zh ? "价格以美元计价，结算时可能加收税费。" : "Prices are in USD. Taxes may apply at checkout."}
          </p>
        </div>

        <PricingPlans lang={lang} />

        <section className="mt-16">
          <h2 className="text-xl font-semibold text-white">{zh ? "常见问题" : "FAQ"}</h2>
          <div className="mt-6 space-y-4">
            {localizedFaqs.map((f) => (
              <div key={f.q} className="glass rounded-xl p-5">
                <p className="text-sm font-medium text-slate-200">{f.q}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-14 text-center">
          <Link
            href="/register"
            className="btn-primary inline-block rounded-full px-8 py-3.5 text-sm font-semibold text-white"
          >
            {zh ? "免费开始" : "Start for free"}
          </Link>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
