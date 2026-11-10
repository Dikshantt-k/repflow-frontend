"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Spinner } from "@/components/ui";

const TABS = [
  { href: "/member/home", label: "Home" },
  { href: "/member/visits", label: "Visits" },
  { href: "/member/workout", label: "Workout" },
  { href: "/member/profile", label: "Profile" },
];

export default function MemberAppLayout({ children }: { children: React.ReactNode }) {
  const { user, context, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (context && context.role !== "member") router.replace("/app/dashboard");
  }, [loading, user, context, router]);

  if (loading || !user || !context || context.role !== "member") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex justify-center bg-bg">
      <div className="w-full max-w-[430px] min-h-screen flex flex-col shadow-[0_0_0_1px_var(--line)]">
        <div className="flex justify-between items-center px-4.5 py-2.5 border-b border-line2">
          <span className="font-display font-semibold text-lg">{context.org?.name ?? "Repflow"}</span>
          <div className="flex items-center gap-2">
            <ThemeToggle className="onlight border-line text-ink bg-surface" />
            <button type="button" onClick={logout} className="text-sm font-semibold text-link">
              Log out
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 pb-28">{children}</div>

        <nav className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-[430px] bg-surface border-t border-line grid grid-cols-4">
          {TABS.map((tab) => {
            const active = pathname?.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[60px] text-xs font-semibold ${
                  active ? "text-link" : "text-muted"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
