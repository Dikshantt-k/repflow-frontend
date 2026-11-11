"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { visibleNavFor } from "@/lib/nav";
import { hasModule } from "@/lib/modules";
import { ThemeToggle } from "@/components/ThemeToggle";
import { initials } from "@/lib/format";
import { Spinner } from "@/components/ui";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const { user, context, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

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

  const nav = [...visibleNavFor(context.role, context.org?.modules)];
  if (context.role === "org_owner" || context.role === "franchise_owner") {
    nav.splice(1, 0, { href: "/app/branches", label: "Branches" });
  }
  if (context.role === "org_owner" && context.org?.businessType === "franchise" && hasModule(context.org?.modules, "franchise_network")) {
    nav.splice(2, 0, { href: "/app/franchisees", label: "Franchisees" });
  }
  if (context.role === "org_owner" && hasModule(context.org?.modules, "audit_log")) {
    nav.push({ href: "/app/audit", label: "Activity log" });
  }
  const isPlatformRole = context.role === "super_admin" || context.role === "support";
  const brandName = isPlatformRole ? "Repflow" : (context.org?.name ?? "Repflow");
  const roleLabel = context.role.replace(/_/g, " ");

  return (
    <div className="flex flex-wrap min-h-screen">
      <aside className={`flex-1 basis-[236px] bg-side text-side-ink p-6 px-4 flex flex-col gap-5 ${menuOpen ? "" : "max-md:pb-4"}`}>
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 flex-none rounded-[9px] bg-side-accent text-[#12201D] flex items-center justify-center font-display italic font-extrabold -skew-x-6">
            {initials(brandName, "")}
          </span>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold truncate">{brandName}</span>
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

        <nav className={`flex-col gap-0.5 ${menuOpen ? "flex" : "hidden md:flex"}`}>
          {nav.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 min-h-[46px] px-3 rounded-lg font-medium ${
                  active ? "bg-side-active text-white font-semibold shadow-[inset_3px_0_0_var(--side-accent)]" : "text-side-muted hover:text-side-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={`mt-auto p-3 rounded-[10px] bg-side-active flex-col gap-0.5 ${menuOpen ? "flex" : "hidden md:flex"}`}>
          <span className="font-semibold">{user.name ?? user.email}</span>
          <span className="text-xs text-side-muted capitalize">
            {roleLabel}
            {context.branch ? ` · ${context.branch.name}` : ""}
          </span>
          <button type="button" onClick={logout} className="text-sm text-side-ink mt-1.5 text-left">
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-[999] basis-[560px] min-w-0 p-7 px-8 pb-12 flex flex-col gap-5">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-5">{children}</div>
      </main>
    </div>
  );
}
