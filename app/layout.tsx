import type { Metadata } from "next";
import { AuthModalProvider } from "@/components/auth/AuthModalProvider";
import ToastHost from "@/components/ui/ToastHost";
import "./globals.css";

export const metadata: Metadata = {
  title: "US market intelligence, one dashboard",
  description:
    "Live US, China and Japan/Korea market data with technical indicators, a backtest simulator and an AI market assistant.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full overflow-x-hidden text-slate-100">
        <AuthModalProvider>{children}</AuthModalProvider>
        <ToastHost />
      </body>
    </html>
  );
}
