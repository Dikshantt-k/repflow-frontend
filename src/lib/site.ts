/**
 * One place for the public site's name, address and wording, used by metadata, structured data,
 * the sitemap and robots. The brand is "Repflow 360" (the name on the domain) so search engines
 * don't confuse it with other products called RepFlow.
 */
export const SITE = {
  name: "Repflow 360",
  shortName: "Repflow",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.repflow360.in").replace(/\/$/, ""),
  tagline: "Gym management software for every branch",
  description:
    "Repflow 360 is gym management software for single gyms, multi-branch gyms and franchises: members, plans, payments straight to your own account, GST/VAT receipts, attendance, staff and a member app. 14-day free trial.",
  countries: ["India", "United Arab Emirates", "United Kingdom", "United States", "Australia"],
  keywords: [
    "gym management software",
    "gym software India",
    "gym billing software",
    "gym membership software",
    "multi-branch gym software",
    "franchise gym software",
    "fitness club management",
    "gym attendance software",
    "gym CRM",
    "Repflow 360",
  ],
} as const;

export const absoluteUrl = (path = "/") => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
