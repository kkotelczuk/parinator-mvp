import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@parinator/ui", "@parinator/schema"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3008/api/:path*", // Proxy to Backend
      },
    ];
  },
};

export default nextConfig;
