import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SITE } from "@/lib/site";

/** Footer for the public pages: crawlable links to every public page, and the brand name in text. */
export function SiteFooter() {
  return (
    <footer className="px-6 py-8 border-t border-line text-sm text-muted">
      <div className="max-w-[1100px] mx-auto flex flex-wrap items-center justify-between gap-4">
        <span className="inline-flex items-center gap-2.5">
          <Logo size="sm" />
          <span>
            {SITE.name} &middot; Gym management software &middot; {new Date().getFullYear()}
          </span>
        </span>
        <nav className="flex flex-wrap gap-4" aria-label="Footer">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <Link href="/pricing" className="hover:text-ink">
            Pricing
          </Link>
          <Link href="/register" className="hover:text-ink">
            Start free trial
          </Link>
          <Link href="/login" className="hover:text-ink">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
