// Mirrors backend/src/config/modules.ts — keep the two in sync. Only a subset of these
// are actually enforced by the backend (requireModule(...) call sites); the rest exist
// so the super-admin package editor can label and toggle them ahead of being wired up.
export const MODULE_KEYS = [
  "members",
  "payments",
  "gst_receipts",
  "manual_attendance",
  "biometric_attendance",
  "auto_reminders",
  "staff_roles",
  "multi_branch_dashboard",
  "franchise_network",
  "network_reports",
  "leads",
  "personal_training",
  "workout_diet",
  "fitness_progress",
  "expenses",
  "audit_log",
  "advanced_reports",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  members: "Member management",
  payments: "Payments & dues",
  gst_receipts: "GST receipts",
  manual_attendance: "Manual attendance",
  biometric_attendance: "Biometric attendance",
  auto_reminders: "Automated reminders (WhatsApp/SMS)",
  staff_roles: "Staff & roles",
  multi_branch_dashboard: "Multi-branch dashboard",
  franchise_network: "Franchise network management",
  network_reports: "Network-wide reports",
  leads: "Leads & enquiries (CRM)",
  personal_training: "Personal training packages",
  workout_diet: "Workout & diet plans",
  fitness_progress: "Member fitness progress",
  expenses: "Expense tracking",
  audit_log: "Activity / audit log",
  advanced_reports: "Advanced reports",
};

export function hasModule(modules: string[] | undefined, key: ModuleKey): boolean {
  return !!modules?.includes(key);
}
