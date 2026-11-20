import LegalPage from "@/components/legal/LegalPage";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

export const metadata = {
  title: "Privacy Policy",
  description:
    "FolioScope Privacy Policy covering account data, watchlists, subscriptions, infrastructure providers and account deletion.",
};

export default function PrivacyPage() {
  return (
    <LegalPage id="privacy" title="Privacy Policy">
      <h2>1. Overview</h2>
      <p>
        FolioScope (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), operated
        at{" "}
        <a href={SITE_URL}>{SITE_URL}</a>, respects
        your privacy and is committed to protecting your personal data. This
        Privacy Policy explains what information we collect, how we use it, and
        how you can manage or delete your data.
      </p>

      <h2>2. Information We Collect</h2>
      <ul>
        <li>
          <strong>Account &amp; Identity Information:</strong> When you log in
          via Google OAuth or GitHub OAuth, we receive your name, email
          address, and profile avatar URL to create and authenticate your user
          account.
        </li>
        <li>
          <strong>User-Generated Workspace Data:</strong> We store your saved
          stock watchlists, portfolio backtest parameters, and interface
          preferences so they sync across your devices.
        </li>
        <li>
          <strong>Subscription Metadata:</strong> When you upgrade to FolioScope
          Pro, we store non-sensitive billing status records (such as your plan
          tier, subscription status, and billing period end date) synced from our
          payment processor. We do not collect, process, or store your credit
          card numbers, CVV codes, or bank account credentials.
        </li>
        <li>
          <strong>Basic Technical Logs:</strong> Standard server request metadata
          (such as IP address, browser type, and timestamps) processed during
          page loads and API requests for security, rate-limiting, and debugging.
        </li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <p>We use collected data strictly to:</p>
      <ul>
        <li>Authenticate your identity and maintain your account session.</li>
        <li>
          Sync your watchlists and deliver Free or Pro tier features.
        </li>
        <li>Generate automated AI financial summaries upon your request.</li>
        <li>
          Provide customer support and communicate critical service or billing
          updates.
        </li>
      </ul>
      <p>
        We do not sell, rent, or trade your personal information to third-party
        advertisers or data brokers.
      </p>

      <h2>4. Third-Party Infrastructure &amp; Sub-Processors</h2>
      <p>
        To operate FolioScope securely and reliably, we rely on the following
        service providers:
      </p>
      <ul>
        <li>
          <strong>Supabase:</strong> Provides user authentication and PostgreSQL
          database hosting with Row-Level Security (RLS) to isolate user data.
        </li>
        <li>
          <strong>Vercel:</strong> Hosts our web application and executes
          serverless backend API functions.
        </li>
        <li>
          <strong>Creem:</strong> Acts as our Merchant of Record to process
          subscription payments, manage customer billing portals, and handle
          global tax compliance.
        </li>
        <li>
          <strong>FolioScope AI service providers:</strong> Process public financial report text and
          ticker queries via API to generate automated research summaries. We do
          not transmit your personal identity or email address in AI
          summarization prompts.
        </li>
      </ul>

      <h2>5. Data Retention &amp; Permanent Account Deletion</h2>
      <p>
        We retain your account profile and watchlist data only for as long as
        your account remains active. You have the right to access, export, or
        permanently delete your data at any time:
      </p>
      <ul>
        <li>
          <strong>Self-Service Deletion:</strong> You can permanently delete your
          account directly inside Account Settings on FolioScope. Triggering
          account deletion immediately removes your profile, authentication
          record, and saved watchlists from our active database.
        </li>
        <li>
          <strong>Email Request:</strong> You may also request manual account
          deletion or privacy assistance by emailing{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </li>
      </ul>

      <h2>6. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time to reflect platform
        or regulatory changes. The updated effective date will be posted at the
        top of this page.
      </p>
    </LegalPage>
  );
}
