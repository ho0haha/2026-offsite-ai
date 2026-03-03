import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  outputFileTracingIncludes: {
    "/api/validate": ["./data/stubs/**", "./data/ground_truth/**"],
    "/api/starter/[challengeNumber]": ["./data/starter-bundles/**"],
  },
};

export default nextConfig;
