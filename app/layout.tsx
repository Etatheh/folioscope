import type { Metadata } from "next";
import { AuthModalProvider } from "@/components/auth/AuthModalProvider";
import ToastHost from "@/components/ui/ToastHost";
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
  authors: [{ name: "Yibo Gui" }],
  creator: "Yibo Gui",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full overflow-x-hidden text-slate-100">
        <AuthModalProvider>
          <WatchlistProvider>{children}</WatchlistProvider>
        </AuthModalProvider>
        <ToastHost />
      </body>
    </html>
  );
}
