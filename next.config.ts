import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    // Allow builds with ESLint warnings (to be fixed incrementally)
    ignoreDuringBuilds: true,
  },
};
export default nextConfig;
