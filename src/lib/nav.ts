import type { Role } from "@/types/api";
import { hasModule, type ModuleKey } from "./modules";

export interface NavItem {
  href: string;
  label: string;
  module?: ModuleKey; // hidden entirely when the org's package doesn't include this
}

const DASHBOARD: NavItem = { href: "/app/dashboard", label: "Dashboard" };
const MEMBERS: NavItem = { href: "/app/members", label: "Members" };
const PLANS: NavItem = { href: "/app/plans", label: "Membership plans" };
const LEADS: NavItem = { href: "/app/leads", label: "Leads & enquiries", module: "leads" };
const PAYMENTS: NavItem = { href: "/app/payments", label: "Payments and dues" };
const EXPENSES: NavItem = { href: "/app/expenses", label: "Expenses", module: "expenses" };
const ATTENDANCE: NavItem = { href: "/app/attendance", label: "Attendance" };
const STAFF: NavItem = { href: "/app/staff", label: "Staff" };
const ROLES: NavItem = { href: "/app/roles", label: "Roles & permissions" };
const COUNTRY_SETTINGS: NavItem = { href: "/app/settings/country", label: "Country & tax" }; // Round 3
const PAYMENT_SETTINGS: NavItem = { href: "/app/settings/payments", label: "Payment accounts" }; // per-gym payments
const BILLING: NavItem = { href: "/app/billing", label: "Billing & plan" }; // the owner's Repflow subscription
const TRAINER_HOME: NavItem = { href: "/app/trainer", label: "My dashboard" };

const ADMIN_NAV: NavItem[] = [
  { href: "/app/admin/gyms", label: "Gyms" },
  { href: "/app/admin/packages", label: "Packages" },
  { href: "/app/admin/audit", label: "Activity log" },
  ROLES,
];

function navFor(role: Role): NavItem[] {
  switch (role) {
    case "super_admin":
    case "support":
      return ADMIN_NAV;
    case "trainer":
      return [TRAINER_HOME, MEMBERS, PLANS, ATTENDANCE, ROLES]; // Round 5: list prices, read-only
    case "accountant":
      return [DASHBOARD, MEMBERS, PAYMENTS, EXPENSES, ATTENDANCE, ROLES];
    case "front_desk":
      return [DASHBOARD, MEMBERS, LEADS, PAYMENTS, ATTENDANCE, ROLES];
    case "org_owner":
      return [DASHBOARD, MEMBERS, PLANS, LEADS, PAYMENTS, EXPENSES, ATTENDANCE, STAFF, ROLES, COUNTRY_SETTINGS, PAYMENT_SETTINGS, BILLING];
    case "franchise_owner":
    case "branch_manager":
      return [DASHBOARD, MEMBERS, PLANS, LEADS, PAYMENTS, EXPENSES, ATTENDANCE, STAFF, ROLES, PAYMENT_SETTINGS];
    default:
      return [DASHBOARD, MEMBERS, PLANS, PAYMENTS, ATTENDANCE, STAFF, ROLES];
  }
}

/** Nav items for this role, with any module-gated item the org's package doesn't include filtered out. */
export function visibleNavFor(role: Role, modules: string[] | undefined): NavItem[] {
  // Platform roles aren't tied to an org's package at all.
  if (role === "super_admin" || role === "support") return navFor(role);
  return navFor(role).filter((item) => !item.module || hasModule(modules, item.module));
}

export function homeFor(role: Role): string {
  if (role === "super_admin" || role === "support") return "/app/admin/gyms";
  if (role === "member") return "/member/home";
  if (role === "trainer") return "/app/trainer";
  return "/app/dashboard";
}
