import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optional isolated output for verification builds alongside a running dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // yahoo-finance2 pulls in Node-only cookie/fetch helpers; keep it unbundled.
  serverExternalPackages: ["yahoo-finance2"],
  // Hide the dev-mode floating indicator so it doesn't overlap the navbar logo.
  devIndicators: false,
};

export default nextConfig;
