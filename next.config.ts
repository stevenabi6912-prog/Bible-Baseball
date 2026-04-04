import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGitHubPages ? "/Bible-Baseball" : "",
  assetPrefix: isGitHubPages ? "/Bible-Baseball/" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
