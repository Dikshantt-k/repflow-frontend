import type { Role } from "@/types/api";

// Mirrors the backend's requireRole(...) calls exactly (see backend/src/routes/*.ts).
// Keep this in sync whenever a route's role list changes, so the UI never offers
// an action a role will get a 403 for.

const STAFF_CORE: Role[] = ["org_owner", "franchise_owner", "branch_manager", "front_desk"];
const MANAGERS: Role[] = ["org_owner", "franchise_owner", "branch_manager"];

export const can = {
  // attendance.ts — letting a blocked (expired / frozen / over dues limit) member in once
  overrideCheckin: (r?: Role) => !!r && MANAGERS.includes(r),
  // members.ts
  createMember: (r?: Role) => !!r && STAFF_CORE.includes(r),
  importMembers: (r?: Role) => !!r && STAFF_CORE.includes(r),
  editMember: (r?: Role) => !!r && STAFF_CORE.includes(r),
  freezeMember: (r?: Role) => !!r && STAFF_CORE.includes(r),
  renewMember: (r?: Role) => !!r && STAFF_CORE.includes(r),
  addMemberNote: (r?: Role) => !!r && (STAFF_CORE.includes(r) || r === "trainer"),
  editWorkoutPlan: (r?: Role) => !!r && (STAFF_CORE.includes(r) || r === "trainer"),

  // branches.ts
  createBranch: (r?: Role) => r === "org_owner" || r === "franchise_owner",

  // dues.ts
  collectDue: (r?: Role) => !!r && (STAFF_CORE.includes(r) || r === "accountant"),
  writeOffDue: (r?: Role) => !!r && MANAGERS.includes(r),

  // payments.ts
  recordPayment: (r?: Role) => !!r && (STAFF_CORE.includes(r) || r === "accountant"),

  // plans.ts
  managePlans: (r?: Role) => r === "org_owner",

  // staff.ts / franchisees.ts (page itself is nav-gated; kept here for completeness)
  manageStaff: (r?: Role) => !!r && MANAGERS.includes(r),
  manageFranchisees: (r?: Role) => r === "org_owner",

  // members.ts (PT packages + fitness logs)
  sellPtPackage: (r?: Role) => !!r && STAFF_CORE.includes(r),
  managePtPackage: (r?: Role) => !!r && STAFF_CORE.includes(r),
  // The member's trainer logs sessions; managers may log on their behalf. Front desk can't (Round 2, #22).
  logPtSession: (r?: Role) => !!r && (MANAGERS.includes(r) || r === "trainer"),
  logFitness: (r?: Role) => !!r && (STAFF_CORE.includes(r) || r === "trainer"),
  editDietPlan: (r?: Role) => !!r && (STAFF_CORE.includes(r) || r === "trainer"),

  // audit-logs.ts
  viewAuditLogs: (r?: Role) => r === "org_owner",

  // expenses.ts
  manageExpenses: (r?: Role) => !!r && (MANAGERS.includes(r) || r === "accountant"),

  // leads.ts
  manageLeads: (r?: Role) => !!r && STAFF_CORE.includes(r),
} as const;
