import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optional isolated output for verification builds alongside a running dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // yahoo-finance2 pulls in Node-only cookie/fetch helpers; keep it unbundled.
  serverExternalPackages: ["yahoo-finance2"],
  // Hide the dev-mode floating indicator so it doesn't overlap the navbar logo.
  devIndicators: false,
  // Browser clients use these APIs only from the FolioScope origin. Deliberately
  // do not publish Access-Control-Allow-Origin for authenticated endpoints.
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
