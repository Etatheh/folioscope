import { LanguageProvider } from "@/components/LanguageProvider";
import { getRequestLang } from "@/lib/server/lang";
import type { Metadata } from "next";
import { AuthModalProvider } from "@/components/auth/AuthModalProvider";
import ToastHost from "@/components/ui/ToastHost";
import CheckoutReturn from "@/components/CheckoutReturn";
import { WatchlistProvider } from "@/components/watchlist/WatchlistProvider";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Quantitative Market Research`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "FolioScope" }],
  creator: "FolioScope",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} — Quantitative Market Research`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Quantitative Market Research`,
    description: SITE_DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getRequestLang();
  return (
    <html lang={lang} className="h-full scroll-smooth antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full overflow-x-hidden text-slate-100">
        <LanguageProvider lang={lang}>
        <AuthModalProvider>
          <WatchlistProvider>{children}</WatchlistProvider>
        </AuthModalProvider>
        <ToastHost />
        <CheckoutReturn />
        </LanguageProvider>
      </body>
    </html>
  );
}
