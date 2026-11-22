import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { Button, Card } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { Reveal } from "@/components/Reveal";
import { RotatingWords } from "@/components/RotatingWords";
import { ScrollProgress } from "@/components/ScrollProgress";
import { ThemeToggle } from "@/components/ThemeToggle";
import { JsonLd } from "@/components/JsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE, absoluteUrl } from "@/lib/site";

// "Repflow 360" leads the title: other products are called RepFlow, and the domain's name is how
// people find and recognise this one.
const TITLE = `${SITE.name} – Gym Management Software for Gyms, Multi-Branch Gyms & Franchises`;
const DESCRIPTION =
  "Run your gym on Repflow 360: members, plans, renewals, dues, GST/VAT receipts, check-ins, staff roles and a member app. Members pay straight into your own account. 14-day free trial, no card needed.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

const HERO_AUDIENCES = ["Gym Owners", "Entrepreneurs", "Franchises", "Fitness Studios", "Multi-Branch Gyms"];

const FEATURES = [
  {
    title: "Members & memberships",
    body: "Add members in seconds, sell plans by branch, and let end dates, renewals and freezes calculate themselves — monthly, daily or session-based.",
  },
  {
    title: "Payments to your own account",
    body: "Members pay by UPI or card straight into your own Razorpay account. Part-payments become dues, and every payment gets a proper GST or VAT receipt.",
  },
  {
    title: "Attendance & check-in",
    body: "Fast front-desk check-in that stops expired, frozen or owing members, with manager overrides logged — and a daily log for every branch.",
  },
  {
    title: "Built for every branch",
    body: "Owners, branch managers, front desk, accountants and trainers each see only their branch and only what their role allows. Trainers never see money.",
  },
  {
    title: "Member app",
    body: "Members see their plan, visits and dues, renew online, request a freeze and follow their workout and diet plans.",
  },
  {
    title: "Franchises & more countries",
    body: "Run a franchise network with its own reports, in India, the UAE, the UK, the US or Australia — with the right currency, tax and time zone.",
  },
];

const STEPS = [
  { n: "1", title: "Sign up in minutes", body: "Add your gym, branches and membership prices, and pick a plan to try free for 14 days." },
  { n: "2", title: "Follow the checklist", body: "Connect your payment account, invite your staff and import your members." },
  { n: "3", title: "Run it daily", body: "Check-ins, renewals, dues and reminders tracked automatically across every branch." },
];

// Shown on the page AND sent as FAQPage structured data, so the answers match what people read.
const FAQS = [
  {
    q: "What is Repflow 360?",
    a: "Repflow 360 is gym management software for single gyms, multi-branch gyms and franchises. It covers members, memberships, payments and dues, receipts, attendance, staff, personal training and a member app.",
  },
  {
    q: "Where does my members' money go?",
    a: "Straight into your gym's own payment account. You connect your Razorpay account once; Repflow 360 never holds your members' money.",
  },
  {
    q: "How much does it cost?",
    a: "Plans start from a low monthly price per branch, and every plan starts with a 14-day free trial with no card needed. See the pricing page for current prices.",
  },
  {
    q: "Does it work for multi-branch gyms and franchises?",
    a: "Yes. Each branch has its own staff, plans and reports, the owner sees everything, and franchise networks can let each franchisee use its own payment account.",
  },
  {
    q: "Which countries are supported?",
    a: "India, the United Arab Emirates, the United Kingdom, the United States and Australia, with each country's currency, tax on receipts, phone format and time zone.",
  },
  {
    q: "Can I move my existing members over?",
    a: "Yes. Import your members from a spreadsheet during setup, or add them one by one at the front desk.",
  },
];

const STRUCTURED_DATA = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: SITE.name,
    alternateName: [SITE.shortName, "Repflow360"],
    url: SITE.url,
    logo: { "@type": "ImageObject", url: absoluteUrl("/logo.png"), width: 512, height: 512 },
    description: SITE.description,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: SITE.name,
    alternateName: SITE.shortName,
    url: SITE.url,
    publisher: { "@id": absoluteUrl("/#organization") },
    inLanguage: "en",
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE.name,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Gym management software",
    operatingSystem: "Web, Android, iOS",
    url: SITE.url,
    image: absoluteUrl("/opengraph-image.jpg"),
    description: DESCRIPTION,
    areaServed: SITE.countries,
    publisher: { "@id": absoluteUrl("/#organization") },
    featureList: FEATURES.map((f) => f.title),
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <JsonLd data={STRUCTURED_DATA} />
      <ScrollProgress />

      <main className="flex-1">
        <section className="relative isolate min-h-[100svh] flex flex-col overflow-hidden bg-[#0b0f0e] text-white">
          <Image src="/hero-gym.jpg" alt="" fill priority sizes="100vw" className="object-cover -z-20" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0a2a30]/75 via-[#0b1f24]/60 to-[#0a1a1f]/85" />

          <header className="fixed top-0 inset-x-0 z-50 px-4 pt-3 md:px-8 md:pt-4">
            <div className="flex items-center justify-between gap-4 max-w-[1100px] mx-auto rounded-2xl bg-[#1c7181]/55 shadow-lg shadow-black/10 backdrop-blur-xl backdrop-saturate-150 border border-white/25 px-4 py-2.5">
              <Link href="/" aria-label={`${SITE.name} home`} className="inline-flex items-center gap-2.5">
                <Logo size="sm" wordmark={false} />
                <span className="font-display italic font-extrabold text-xl leading-none">Repflow</span>
              </Link>
              <nav className="flex items-center gap-2 sm:gap-5 text-sm" aria-label="Main">
                <a href="#features-heading" className="hidden md:inline font-medium text-white/80 hover:text-white">
                  Features
                </a>
                <a href="#how-heading" className="hidden md:inline font-medium text-white/80 hover:text-white">
                  How it works
                </a>
                <Link href="/pricing" className="hidden sm:inline font-medium text-white/80 hover:text-white">
                  Pricing
                </Link>
                <a href="#faq-heading" className="hidden md:inline font-medium text-white/80 hover:text-white">
                  FAQ
                </a>
                <ThemeToggle variant="light" />
                <Link href="/login" className="rounded-xl bg-white/10 hover:bg-white/20 px-3.5 py-2 font-semibold">
                  Sign in
                </Link>
                <Link href="/register" className="rounded-xl bg-gradient-to-r from-[#2bb39a] to-[#049d98] hover:brightness-110 text-[#04201b] px-3.5 py-2 font-semibold">
                  Start free
                </Link>
              </nav>
            </div>
          </header>

          <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 px-6 pt-32 pb-16 max-w-[820px] mx-auto w-full">
            {/* <span className="hero-in inline-flex items-center gap-2 text-xs font-semibold rounded-md px-3 py-1.5 bg-accent-pop/20 text-accent-pop backdrop-blur-sm">
              Try free for 14 days.
            </span> */}
            <h1 className="hero-in text-4xl sm:text-5xl md:text-7xl leading-[1.1]" style={{ "--d": "90ms" } as CSSProperties}>
              The powerhouse platform
              <br />
              <span className="inline-flex items-baseline gap-3 whitespace-nowrap">
                <span className="font-light text-white/80 shrink-0">for</span>
                <RotatingWords words={HERO_AUDIENCES} variant="fade-blur" />
              </span>
            </h1>
            <p className="hero-in text-base md:text-lg text-white/80 max-w-xl" style={{ "--d": "180ms" } as CSSProperties}>
              {/* Members, memberships, payments straight to your own account, GST and VAT receipts, attendance, staff and a member
              app &mdash; one system for every branch of your gym. */}
              RepFlow is the best gym management software for growing businesses.
            </p>
            <form
              action="/register"
              method="get"
              className="hero-in mt-2 flex w-full max-w-md items-center gap-2 rounded-full bg-black/40 backdrop-blur-md border border-white/15 p-1.5 pl-5"
              style={{ "--d": "270ms" } as CSSProperties}
            >
              <label htmlFor="hero-email" className="sr-only">
                Email address
              </label>
              <input
                id="hero-email"
                suppressHydrationWarning
                name="email"
                type="email"
                placeholder="Enter your e-mail"
                className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder:text-white/60 outline-none"
              />
              <button
                type="submit"
                className="rounded-full bg-gradient-to-r from-[#2bb39a] to-[#049d98] hover:brightness-110 text-[#04201b] font-semibold text-sm px-5 min-h-[44px] whitespace-nowrap transition active:scale-[0.97]"
              >
                Start free
              </button>
            </form>
            <p className="hero-in text-sm text-white/70 inline-flex items-center gap-1.5" style={{ "--d": "330ms" } as CSSProperties}>
              <span className="w-1.5 h-1.5 rounded-full bg-accent-pop" />
              No card required &middot; Multi-branch &amp; franchise-ready
            </p>
          </div>

          <div className="px-4 pb-5 md:pb-8 w-full">
            <div className="flex items-center justify-between gap-4 max-w-md mx-auto rounded-2xl bg-black/45 backdrop-blur-md border border-white/10 px-5 py-3">
              <div className="text-left">
                <p className="font-semibold text-sm">14 days free</p>
                <p className="text-xs text-white/70">Start your trial</p>
              </div>
              <Link href="/register" className="rounded-full bg-gradient-to-r from-[#2bb39a] to-[#049d98] hover:brightness-110 text-[#04201b] font-semibold text-xs px-4 py-2.5">
                Get started
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 py-10 max-w-[1100px] mx-auto" aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-2xl mb-6">
            Everything your gym runs on
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <Card className="h-full hover-lift">
                  <h3 className="text-xl">{f.title}</h3>
                  <p className="text-muted">{f.body}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="px-6 py-16 max-w-[1100px] mx-auto" aria-labelledby="how-heading">
          <h2 id="how-heading" className="text-2xl mb-6">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 100}>
                <div className="flex flex-col gap-2">
                  <span className="w-9 h-9 flex items-center justify-center rounded-full bg-accent text-on-accent font-display font-bold">
                    {s.n}
                  </span>
                  <h3 className="font-semibold text-lg">{s.title}</h3>
                  <p className="text-muted">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="px-6 py-10 max-w-[860px] mx-auto" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl mb-4">
            Questions gym owners ask
          </h2>
          <div className="flex flex-col divide-y divide-line border-y border-line">
            {FAQS.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-semibold text-lg">
                  <h3 className="text-lg">{f.q}</h3>
                  <span aria-hidden className="text-muted transition-transform group-open:rotate-45 text-2xl leading-none">
                    +
                  </span>
                </summary>
                <p className="text-muted mt-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="px-6 py-16 max-w-[1100px] mx-auto">
          <Reveal>
            <Card className="items-center text-center gap-4 py-12 bg-accent-soft border-transparent hover-lift">
              <h2 className="text-3xl">Ready to run your gym on {SITE.name}?</h2>
              <Link href="/register">
                <Button variant="primary" className="text-base px-6">
                  Start your free trial
                </Button>
              </Link>
            </Card>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
