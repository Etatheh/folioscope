import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GUI Markets — Three markets, one dashboard",
  description:
    "Live US, China and Japan/Korea market data with technical indicators, a backtest simulator and an AI market assistant.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth antialiased">
      <body className="min-h-full overflow-x-hidden text-slate-100">{children}</body>
    </html>
  );
}
