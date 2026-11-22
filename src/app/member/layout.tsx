"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { hasModule, type ModuleKey } from "@/lib/modules";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Spinner } from "@/components/ui";
import { initials } from "@/lib/format";
import { IconCalendar, IconDumbbell, IconHome, IconLogout, IconTrend, IconUser } from "@/components/icons";

const TABS: Array<{ href: string; label: string; short: string; icon: (size: number) => ReactNode; module?: ModuleKey }> = [
  { href: "/member/home", label: "Home", short: "Home", icon: (s) => <IconHome size={s} /> },
  { href: "/member/visits", label: "Visits", short: "Visits", icon: (s) => <IconCalendar size={s} /> },
  { href: "/member/workout", label: "Workout & diet", short: "Workout", icon: (s) => <IconDumbbell size={s} />, module: "workout_diet" },
  { href: "/member/progress", label: "Progress", short: "Progress", icon: (s) => <IconTrend size={s} />, module: "fitness_progress" },
  { href: "/member/profile", label: "Profile", short: "Profile", icon: (s) => <IconUser size={s} /> },
];

export default function MemberAppLayout({ children }: { children: React.ReactNode }) {
  const { user, context, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.mustChangePassword) router.replace("/set-password");
    else if (context && context.role !== "member") router.replace("/app/dashboard");
  }, [loading, user, context, router]);

  if (loading || !user || !context || context.role !== "member" || user.mustChangePassword) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const tabs = TABS.filter((tab) => !tab.module || hasModule(context.org?.modules, tab.module));
  const gymName = context.org?.name ?? "Repflow";
  const displayName = user.name ?? user.phone ?? user.email ?? "Member";
  const [first, ...rest] = displayName.split(" ");
  const subtitle = context.branch?.name ?? "Member";

  return (
    <div className="theme-slate min-h-screen bg-bg text-ink md:flex">
      {/* ---- Desktop sidebar ---- */}
      <aside className="hidden md:flex w-[240px] flex-none bg-side text-side-ink px-3.5 pt-5 pb-4 flex-col gap-5 sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 px-1.5">
          <span className="w-9 h-9 flex-none rounded-[10px] bg-side-accent text-on-accent flex items-center justify-center font-display italic font-extrabold -skew-x-6">
            {initials(gymName, "")}
          </span>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-[15px] leading-tight truncate">{gymName}</span>
            <span className="text-xs text-side-muted truncate">{subtitle}</span>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5">
          {tabs.map((tab) => {
            const active = pathname?.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-3 min-h-[40px] px-3 rounded-[10px] text-[14.5px] font-medium transition ${
                  active ? "bg-side-accent text-on-accent font-semibold" : "text-side-ink/90 hover:bg-side-active"
                }`}
              >
                {tab.icon(17)}
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-2.5 rounded-[14px] bg-side-active flex items-center gap-2.5">
          <span className="w-9 h-9 flex-none rounded-full bg-side-field flex items-center justify-center text-[13px] font-semibold">
            {initials(first ?? "", rest.join(" ") || undefined)}
          </span>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-semibold text-sm truncate">{displayName}</span>
            <span className="text-xs text-side-muted truncate">Member</span>
          </div>
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={logout}
          className="-mt-2 flex items-center gap-2 px-3 min-h-[36px] text-sm font-medium text-side-muted hover:text-side-ink"
        >
          <IconLogout size={15} /> Log out
        </button>
      </aside>

      {/* ---- Mobile top bar ---- */}
      <header className="md:hidden sticky top-0 z-10 flex items-center gap-2.5 px-4 h-14 bg-side text-side-ink">
        <span className="w-7 h-7 flex-none rounded-[8px] bg-side-accent text-on-accent flex items-center justify-center text-sm font-display italic font-extrabold -skew-x-6">
          {initials(gymName, "")}
        </span>
        <span className="font-semibold truncate flex-1">{gymName}</span>
        <ThemeToggle />
        <button type="button" onClick={logout} className="text-sm font-semibold text-side-accent px-1">
          Log out
        </button>
      </header>

      <main className="flex-1 min-w-0 px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-12">
        <div className="w-full max-w-[1100px] mx-auto flex flex-col gap-4">{children}</div>
      </main>

      {/* ---- Mobile bottom tab bar ---- */}
      <nav
        className="md:hidden fixed inset-x-0 bottom-0 z-10 bg-side text-side-muted grid pb-[env(safe-area-inset-bottom)]"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const active = pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-1 min-h-[62px] text-[11px] font-semibold ${active ? "text-side-accent" : ""}`}
            >
              {tab.icon(20)}
              {tab.short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
