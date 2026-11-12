import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* SEO: one address for the site. Google had indexed http://repflow360.in while the canonical is
   * https://www.repflow360.in; this permanently redirects the bare domain to www (Vercel serves
   * HTTPS and redirects http itself). Matches nothing locally. */
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "repflow360.in" }],
        destination: "https://www.repflow360.in/:path*",
        permanent: true,
      },
    ];
  },
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
