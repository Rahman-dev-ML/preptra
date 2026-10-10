import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep the home screen in memory so Back does not download it again.
    staleTimes: { dynamic: 60, static: 300 },
    routerBFCache: true,
  },
};

export default nextConfig;
