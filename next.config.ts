import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Bible-Baseball",
  assetPrefix: "/Bible-Baseball/",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
