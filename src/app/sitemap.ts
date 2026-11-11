import type { MetadataRoute } from "next";

const BASE_URL = "https://www.repflow360.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${BASE_URL}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/register`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/login`, lastModified, changeFrequency: "monthly", priority: 0.5 },
  ];
}
