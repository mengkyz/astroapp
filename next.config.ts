import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for Docker deployment
  output: "standalone",
  serverExternalPackages: ["swisseph"],
};

export default nextConfig;
