import LegalPage from "@/components/legal/LegalPage";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

export const metadata = {
  title: "Terms of Service",
  description:
    "FolioScope Terms of Service covering accounts, subscriptions, billing, acceptable use and liability.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using FolioScope (
        <a href={SITE_URL}>{SITE_URL}</a>), operated by Yibo Gui, creating an
        account, or subscribing to a paid plan,
        you agree to be bound by these Terms of Service and our Financial &
        Backtesting Disclaimer. If you do not agree to these terms, you must
        discontinue use of the service.
      </p>

      <h2>2. Description of Service &amp; Tiers</h2>
      <p>
        FolioScope provides web-based financial charting, portfolio backtesting,
        and automated financial report summarization tools:
      </p>
      <ul>
        <li>
          <strong>Free Plan:</strong> Provides access to a curated pool of 14
          benchmark stocks, interactive historical charts, and core portfolio
          and DCA backtesting tools.
        </li>
        <li>
          <strong>Pro Subscription Plan:</strong> Unlocks full U.S. equity
          search, extended multi-market coverage across the United States,
          Europe, Japan, and South Korea, cloud watchlist synchronization, and
          automated AI financial report summaries.
        </li>
      </ul>
      <p>
        We reserve the right to update, modify, or enhance features across tiers
        to maintain platform stability and data provider compliance.
      </p>

      <h2>3. User Accounts &amp; Security</h2>
      <p>
        You may sign in to FolioScope using supported third-party identity
        providers, specifically Google OAuth and GitHub OAuth. You are
        responsible for maintaining the security of your connected OAuth account
        and for all activity conducted under your FolioScope profile. You must be
        at least 18 years old (or the age of legal majority in your jurisdiction)
        to purchase a paid subscription.
      </p>

      <h2>4. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          Use automated scripts, bots, scrapers, or crawlers to extract market
          data, backtest outputs, or AI summaries from FolioScope.
        </li>
        <li>
          Redistribute, resell, sublicense, or commercially broadcast data feeds
          or reports obtained through the platform.
        </li>
        <li>
          Attempt to bypass subscription access controls, rate limits, or
          database security policies, or interfere with the operation of our
          infrastructure.
        </li>
      </ul>

      <h2>5. Billing, Merchant of Record &amp; Subscriptions</h2>
      <p>
        All paid subscriptions on FolioScope are processed by Creem (creem.io),
        which acts as our authorized Merchant of Record. Creem handles payment
        processing, invoicing, and applicable global sales tax or VAT calculation
        and remittance.
      </p>
      <ul>
        <li>
          <strong>Recurring Billing:</strong> Pro subscriptions renew
          automatically at the end of each monthly or annual billing cycle unless
          canceled prior to the renewal date.
        </li>
        <li>
          <strong>Cancellation:</strong> You may cancel your subscription at any
          time via the Manage Subscription portal in your Account Settings. Upon
          cancellation, you will retain Pro access until the end of your current
          paid billing period.
        </li>
      </ul>

      <h2>6. Intellectual Property</h2>
      <p>
        All software code, user interface designs, proprietary visualization
        layouts, and branding associated with FolioScope are the exclusive
        property of Yibo Gui. Underlying market prices and corporate filings
        remain the property of their respective exchanges and data providers.
      </p>

      <h2>7. Limitation of Liability &amp; Disclaimer of Warranties</h2>
      <p>
        FolioScope is provided on an &quot;AS IS&quot; and &quot;AS
        AVAILABLE&quot; basis without warranties of any kind, either express or
        implied. To the maximum extent permitted by applicable law, Yibo Gui and
        FolioScope shall not be liable for any direct, indirect, incidental,
        consequential, or financial losses—including trading losses, lost
        profits, or loss of data—arising out of your use of, or inability to use,
        the platform.
      </p>

      <h2>8. Contact</h2>
      <p>
        For support, billing inquiries, or legal notices, contact us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}