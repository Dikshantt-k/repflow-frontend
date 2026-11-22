"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { NAV_GROUP_ORDER, visibleNavFor, type NavItem } from "@/lib/nav";
import { hasModule } from "@/lib/modules";
import { ThemeToggle } from "@/components/ThemeToggle";
import { initials } from "@/lib/format";
import { Spinner } from "@/components/ui";
import { AccountStatusBanner } from "@/components/AccountStatusBanner";
import { IconLogout, IconSearch, navIcon } from "@/components/icons";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const { user, context, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.mustChangePassword) router.replace("/set-password");
  }, [loading, user, router]);

  if (loading || !user || !context || user.mustChangePassword) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const nav: NavItem[] = [...visibleNavFor(context.role, context.org?.modules)];
  if (context.role === "org_owner" || context.role === "franchise_owner") {
    nav.splice(1, 0, { href: "/app/branches", label: "Branches", group: "Overview" });
  }
  if (context.role === "org_owner" && context.org?.businessType === "franchise" && hasModule(context.org?.modules, "franchise_network")) {
    nav.splice(2, 0, { href: "/app/franchisees", label: "Franchisees", group: "Overview" });
  }
  if (context.role === "org_owner" && hasModule(context.org?.modules, "audit_log")) {
    nav.push({ href: "/app/audit", label: "Activity log", group: "Settings" });
  }
  const sections = NAV_GROUP_ORDER.map((group) => ({ group, items: nav.filter((item) => item.group === group) })).filter((s) => s.items.length > 0);
  const canSearchMembers = nav.some((item) => item.href === "/app/members");

  const isPlatformRole = context.role === "super_admin" || context.role === "support";
  const brandName = isPlatformRole ? "Repflow" : (context.org?.name ?? "Repflow");
  const roleLabel = context.role.replace(/_/g, " ");
  const displayName = user.name ?? user.email ?? user.phone ?? "";
  const [first, ...rest] = displayName.split(" ");

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/app/members?q=${encodeURIComponent(q)}` : "/app/members");
    setMenuOpen(false);
  }

  return (
    <div className="theme-slate flex flex-wrap min-h-screen bg-bg text-ink">
      <aside
        className={`flex-1 basis-[250px] bg-side text-side-ink px-3.5 pt-5 pb-4 flex flex-col gap-4 md:sticky md:top-0 md:h-screen md:overflow-y-auto ${
          menuOpen ? "" : "max-md:pb-4"
        }`}
      >
        <div className="flex items-center gap-2.5 px-1.5">
          <span className="w-9 h-9 flex-none rounded-[10px] bg-side-accent text-on-accent flex items-center justify-center font-display italic font-extrabold -skew-x-6">
            {initials(brandName, "")}
          </span>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-[15px] leading-tight">{brandName}</span>
            <span className="text-xs text-side-muted">{isPlatformRole ? "Super admin" : "Powered by Repflow"}</span>
          </div>
          <ThemeToggle className="ml-auto" />
          <button
            type="button"
            className="md:hidden min-h-[44px] px-3 rounded-[10px] border border-side-line"
            onClick={() => setMenuOpen((o) => !o)}
          >
            Menu
          </button>
        </div>

        {canSearchMembers && (
          <form onSubmit={onSearch} className={`${menuOpen ? "flex" : "hidden md:flex"} items-center gap-2 h-10 px-3 rounded-[10px] bg-side-field text-side-muted`}>
            <IconSearch size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members..."
              aria-label="Search members"
              className="flex-1 min-w-0 bg-transparent outline-none text-sm text-side-ink placeholder:text-side-muted"
            />
          </form>
        )}

        <nav className={`flex-col gap-3 ${menuOpen ? "flex" : "hidden md:flex"}`}>
          {sections.map(({ group, items }) => (
            <div key={group} className="flex flex-col gap-0.5">
              <div className="px-3 pb-1 text-[11px] font-semibold tracking-[0.08em] uppercase text-side-muted">{group}</div>
              {items.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 min-h-[38px] px-3 rounded-[10px] text-[14.5px] font-medium transition ${
                      active ? "bg-side-accent text-on-accent font-semibold" : "text-side-ink/90 hover:bg-side-active"
                    }`}
                  >
                    {navIcon(item.href)}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={`mt-auto p-2.5 rounded-[14px] bg-side-active items-center gap-2.5 ${menuOpen ? "flex" : "hidden md:flex"}`}>
          <span className="w-9 h-9 flex-none rounded-full bg-side-field flex items-center justify-center text-[13px] font-semibold">
            {initials(first ?? "", rest.join(" ") || undefined)}
          </span>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-semibold text-sm truncate">{displayName}</span>
            <span className="text-xs text-side-muted capitalize truncate">
              {roleLabel}
              {context.branch ? ` · ${context.branch.name}` : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Log out"
            title="Log out"
            className="w-9 h-9 flex-none rounded-[10px] flex items-center justify-center text-side-muted hover:text-side-ink hover:bg-side-field"
          >
            <IconLogout size={16} />
          </button>
        </div>
      </aside>

      <main className="flex-[999] basis-[560px] min-w-0 p-7 px-8 pb-12 max-md:px-4 flex flex-col gap-5">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-5">
          <AccountStatusBanner />
          {children}
        </div>
      </main>
    </div>
  );
}
