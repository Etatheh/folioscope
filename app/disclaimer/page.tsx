import LegalPage from "@/components/legal/LegalPage";
import { SITE_URL } from "@/lib/site";

export const metadata = {
  title: "Financial & Backtesting Disclaimer",
  description:
    "FolioScope financial, backtesting, market data and AI-generated content disclaimer.",
};

export default function DisclaimerPage() {
  return (
    <LegalPage title="Financial & Backtesting Disclaimer">
      <h2>For Informational and Educational Purposes Only</h2>
      <p>
        FolioScope (
        <a href={SITE_URL}>{SITE_URL}</a>) is a
        quantitative data visualization and historical portfolio backtesting
        software platform operated by FolioScope. All market charts, historical
        price series, Dollar-Cost Averaging (DCA) simulations, portfolio
        allocation metrics, and automated financial summaries provided on
        FolioScope are strictly for informational, educational, and personal
        research purposes.
      </p>

      <h2>No Investment, Financial, or Legal Advice</h2>
      <p>
        FolioScope is not a registered broker-dealer, investment advisor,
        financial planner, or tax consultant in any jurisdiction. Nothing
        presented on this platform—including any data output, screening filter,
        or AI-generated text—constitutes a recommendation, solicitation, or
        offer to buy, sell, or hold any security, equity, index, or financial
        instrument. You are solely responsible for evaluating the merits and
        risks associated with your own investment decisions and should consult a
        qualified, licensed financial professional before making any financial
        commitment.
      </p>

      <h2>Hypothetical Backtesting Limitations</h2>
      <p>
        Portfolio and DCA backtesting results generated on FolioScope are
        hypothetical and based on historical market data. Simulated performance
        does not represent actual trading and does not account for real-world
        execution factors such as market liquidity, slippage, bid-ask spreads,
        brokerage commissions, dividend withholding taxes, or currency
        conversion fees. Past performance—whether actual or simulated—is not
        indicative of future results.
      </p>

      <h2>AI-Generated Content & Market Data Accuracy</h2>
      <p>
        Automated market commentary and financial report summaries on FolioScope
        are generated through FolioScope AI using third-party large language
        models based on publicly available corporate disclosures. Artificial
        intelligence models can misinterpret numerical tables, omit material
        context, or produce inaccurate summaries. Furthermore, market data feeds
        covering U.S., European, and Asia-Pacific equities may be delayed,
        adjusted, or subject to third-party provider interruptions. FolioScope
        makes no warranties regarding the completeness, timeliness, or accuracy
        of any displayed data or AI output.
      </p>
    </LegalPage>
  );
}
