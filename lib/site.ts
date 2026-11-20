export const SITE_NAME = "FolioScope";
export const SITE_URL = "https://folioscope.live";
/**
 * OAuth providers and hosted checkout returns must always target the canonical
 * production origin. Preview origins are intentionally never accepted here.
 */
export const OAUTH_CALLBACK_URL = `${SITE_URL}/auth/callback`;
export const CREEM_SUCCESS_URL = `${SITE_URL}/dashboard?checkout=success`;
export const CONTACT_EMAIL = "etatheh@hotmail.com";

export const SITE_DESCRIPTION =
  "FolioScope is a quantitative market research and portfolio backtesting platform covering U.S., European and Asia-Pacific equities with AI-assisted fundamental summaries.";

export const SITE_DISCLAIMER =
  "FolioScope is an educational and quantitative research tool. Data, backtests, and AI summaries are for informational purposes only and do not constitute investment advice.";

export const LEGAL_LINKS = [
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund", label: "Refund Policy" },
] as const;
