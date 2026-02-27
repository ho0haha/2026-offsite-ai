import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/validate": ["./data/stubs/**", "./data/ground_truth/**"],
  },
};

export default nextConfig;
