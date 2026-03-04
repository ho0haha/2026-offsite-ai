import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  outputFileTracingIncludes: {
    "/api/validate": ["./data/stubs/**", "./data/ground_truth/**"],
    "/api/starter/[challengeNumber]": ["./data/starter-bundles/**"],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
