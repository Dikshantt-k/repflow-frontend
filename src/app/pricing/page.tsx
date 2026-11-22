import Link from "next/link";
import type { Metadata } from "next";
import { Button, Card } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { JsonLd } from "@/components/JsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE, absoluteUrl } from "@/lib/site";

const TITLE = "Pricing – Gym Management Software Plans";
const DESCRIPTION = `${SITE.name} plans for single gyms, multi-branch gyms and franchises. Every plan starts with a 14-day free trial, no card needed. Members pay straight into your own account.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: { title: `${TITLE} | ${SITE.name}`, description: DESCRIPTION, url: "/pricing" },
  twitter: { title: `${TITLE} | ${SITE.name}`, description: DESCRIPTION },
};

// Prices are edited by the Repflow team in the admin, so they're read from the API (refreshed hourly).
export const revalidate = 3600;

interface PublicPackage {
  _id: string;
  name: string;
  description: string | null;
  monthlyPricePaise: number;
  yearlyPricePaise: number | null;
  chargeUnit: "branch" | "member" | "flat";
  trialDays: number;
  minBranches: number;
  limits: { maxBranches?: number | null; maxMembers?: number | null };
  modules: Array<{ key: string; label: string }>;
}

async function loadPackages(): Promise<PublicPackage[]> {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
  try {
    const res = await fetch(`${api}/signup/packages`, { next: { revalidate } });
    if (!res.ok) return [];
    const json = (await res.json()) as { packages?: PublicPackage[] };
    return json.packages ?? [];
  } catch {
    return []; // the page still renders, with a link to start the trial
  }
}

const inr = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
const UNIT: Record<string, string> = { branch: "per branch / month", member: "per member / month", flat: "per month" };

function branchLine(p: PublicPackage): string {
  const max = p.limits.maxBranches;
  if (max === 1) return "1 branch";
  if (max) return p.minBranches > 1 ? `${p.minBranches}–${max} branches` : `Up to ${max} branches`;
  return p.minBranches > 1 ? `${p.minBranches}+ branches` : "Any number of branches";
}

export default async function PricingPage() {
  const packages = await loadPackages();
  const structured = packages.length
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: `${SITE.name} gym management software`,
        description: DESCRIPTION,
        brand: { "@type": "Brand", name: SITE.name },
        image: absoluteUrl("/opengraph-image.jpg"),
        url: absoluteUrl("/pricing"),
        offers: packages.map((p) => ({
          "@type": "Offer",
          name: p.name,
          price: (p.monthlyPricePaise / 100).toFixed(2),
          priceCurrency: "INR",
          url: absoluteUrl("/register"),
          availability: "https://schema.org/InStock",
        })),
      }
    : null;

  return (
    <div className="flex flex-col min-h-screen">
      {structured && <JsonLd data={structured} />}
      <header className="flex items-center justify-between px-6 py-5 max-w-[1100px] w-full mx-auto">
        <Link href="/" aria-label={`${SITE.name} home`}>
          <Logo />
        </Link>
        <nav className="flex items-center gap-4" aria-label="Main">
          <ThemeToggle variant="light" />
          <Link href="/login" className="font-semibold text-link">
            Sign in
          </Link>
        </nav>
      </header>

      <main className="flex-1 px-6 py-12 max-w-[1100px] w-full mx-auto flex flex-col gap-8">
        <div className="flex flex-col gap-3 max-w-2xl">
          <h1 className="text-4xl md:text-5xl">Simple pricing for every gym</h1>
          <p className="text-lg text-muted">
            Pick a plan by the size of your gym. Every plan starts with a 14-day free trial, no card needed, and you can switch
            plans at any time. Members&apos; payments go straight to your own account, with no Repflow cut.
          </p>
        </div>

        {packages.length === 0 ? (
          <Card className="gap-3">
            <p>Prices are shown when you start your free trial.</p>
            <div>
              <Link href="/register">
                <Button variant="primary">Start free trial</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {packages.map((p) => (
              <Card key={p._id} className="gap-3">
                <h2 className="text-2xl">{p.name}</h2>
                <p>
                  <span className="text-3xl font-display font-bold">{inr(p.monthlyPricePaise)}</span>{" "}
                  <span className="text-sm text-muted">{UNIT[p.chargeUnit] ?? "per month"}</span>
                </p>
                {p.yearlyPricePaise ? <p className="text-sm text-muted">or {inr(p.yearlyPricePaise)} a year</p> : null}
                <p className="text-sm font-semibold">{branchLine(p)}</p>
                {p.description && <p className="text-sm text-muted">{p.description}</p>}
                <ul className="text-sm flex flex-col gap-1">
                  {p.modules.map((m) => (
                    <li key={m.key}>&#10003; {m.label}</li>
                  ))}
                </ul>
                <div className="mt-auto pt-2">
                  <Link href="/register">
                    <Button variant="primary" className="w-full">
                      Try {p.name} free for {p.trialDays} days
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}

        <p className="text-sm text-muted">
          Prices in Indian rupees, including GST. Gyms in the UAE, UK, US and Australia are billed in rupees for now; your
          members pay you in your own currency.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
