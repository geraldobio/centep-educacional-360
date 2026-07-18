import type { NextConfig } from "next";

const isStaticExport = process.env.STATIC_EXPORT === "1";
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const basePath = isStaticExport && repositoryName ? `/${repositoryName}` : "";

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : undefined,
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: isStaticExport,
};

export default nextConfig;