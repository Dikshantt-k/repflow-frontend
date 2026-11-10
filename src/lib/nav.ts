import type { Role } from "@/types/api";

export interface NavItem {
  href: string;
  label: string;
}

const FULL_NAV: NavItem[] = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/members", label: "Members" },
  { href: "/app/plans", label: "Membership plans" },
  { href: "/app/payments", label: "Payments and dues" },
  { href: "/app/attendance", label: "Attendance" },
  { href: "/app/staff", label: "Staff" },
  { href: "/app/roles", label: "Roles & permissions" },
];

const DESK_NAV: NavItem[] = FULL_NAV.filter((item) => item.href !== "/app/plans" && item.href !== "/app/staff");

const ADMIN_NAV: NavItem[] = [
  { href: "/app/admin/gyms", label: "Gyms" },
  { href: "/app/admin/packages", label: "Packages" },
  { href: "/app/roles", label: "Roles & permissions" },
];

export function navFor(role: Role): NavItem[] {
  if (role === "super_admin" || role === "support") return ADMIN_NAV;
  if (role === "front_desk" || role === "trainer" || role === "accountant") return DESK_NAV;
  return FULL_NAV;
}

export function homeFor(role: Role): string {
  if (role === "super_admin" || role === "support") return "/app/admin/gyms";
  if (role === "member") return "/member/home";
  return "/app/dashboard";
}
