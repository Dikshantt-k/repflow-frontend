import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // These trees require sign-in and have nothing worth indexing — keep crawlers off them.
      disallow: ["/app/", "/member/"],
    },
    sitemap: "https://www.repflow360.in/sitemap.xml",
  };
}
