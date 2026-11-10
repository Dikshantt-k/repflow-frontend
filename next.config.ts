import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* This app is a fully authenticated, client-rendered dashboard with live
   * per-request data — every /app/* route is inherently dynamic, so the
   * experimental static "instant navigation" prerendering (cacheComponents /
   * partialPrefetching) doesn't apply here and only produces noisy
   * validation errors in dev. Left off intentionally. */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
