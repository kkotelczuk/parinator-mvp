import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@parinator/ui", "@parinator/schema"],
};

export default nextConfig;
