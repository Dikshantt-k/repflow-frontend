import { Badge, Card } from "@/components/ui";

interface RoleInfo {
  role: string;
  label: string;
  scope: string;
  tone: "violet" | "blue" | "green" | "orange" | "gray";
  groups: Array<{ area: string; items: string[] }>;
  note?: string;
}

const ROLES: RoleInfo[] = [
  {
    role: "super_admin",
    label: "Super admin",
    scope: "Platform-wide — not tied to any single gym",
    tone: "violet",
    groups: [
      {
        area: "Platform",
        items: [
          "View and manage every gym account on the platform",
          "Assign or change a gym's package and discount",
          "Create and edit packages",
          "View platform invoices and mark them paid",
          "Manually trigger the reminder and billing jobs",
        ],
      },
    ],
  },
  {
    role: "support",
    label: "Support",
    scope: "Platform-wide — reserved role",
    tone: "gray",
    groups: [],
    note: "Exists as a role, but no permissions are wired up to it yet — currently it can sign in but can't do anything super_admin can. Placeholder for a future read-only support seat.",
  },
  {
    role: "org_owner",
    label: "Gym owner",
    scope: "Full control of one gym account, across all its branches",
    tone: "blue",
    groups: [
      { area: "Members", items: ["View, create, edit, freeze and renew members", "Add notes"] },
      { area: "Membership plans", items: ["View, create and edit plans"] },
      { area: "Payments & dues", items: ["Record payments", "Collect and write off dues", "Send dues reminders"] },
      { area: "Attendance", items: ["Check members in and out, view history"] },
      { area: "Staff", items: ["Invite and remove staff of any role, at any branch"] },
      { area: "Branches", items: ["View and create branches"] },
      { area: "Franchisees", items: ["Invite and remove franchisees (franchise gyms only)"] },
      { area: "Dashboard", items: ["View the gym's full dashboard"] },
    ],
  },
  {
    role: "franchise_owner",
    label: "Franchise owner",
    scope: "Full control of their own franchise's branches within the network",
    tone: "blue",
    groups: [
      { area: "Members", items: ["View, create, edit, freeze and renew members", "Add notes"] },
      { area: "Membership plans", items: ["View plans (creating/editing plans is the gym owner's job)"] },
      { area: "Payments & dues", items: ["Record payments", "Collect and write off dues", "Send dues reminders"] },
      { area: "Attendance", items: ["Check members in and out, view history"] },
      { area: "Staff", items: ["Invite and remove staff at their own branches"] },
      { area: "Branches", items: ["View branches; new branches are auto-scoped to their franchisee"] },
      { area: "Dashboard", items: ["View their franchisee's dashboard"] },
    ],
    note: "Cannot manage other franchisees or the company-owned branches.",
  },
  {
    role: "branch_manager",
    label: "Branch manager",
    scope: "Manages one branch",
    tone: "green",
    groups: [
      { area: "Members", items: ["View, create, edit, freeze and renew members", "Add notes"] },
      { area: "Membership plans", items: ["View plans"] },
      { area: "Payments & dues", items: ["Record payments", "Collect and write off dues", "Send dues reminders"] },
      { area: "Attendance", items: ["Check members in and out, view history"] },
      { area: "Staff", items: ["Invite front desk, trainer and accountant staff at their branch"] },
      { area: "Branches", items: ["View branches (cannot create new ones)"] },
      { area: "Dashboard", items: ["View their branch's dashboard"] },
    ],
    note: "Can't invite another branch manager — only the gym or franchise owner can.",
  },
  {
    role: "front_desk",
    label: "Front desk",
    scope: "Day-to-day desk operations at one branch",
    tone: "green",
    groups: [
      { area: "Members", items: ["View, create, edit, freeze and renew members"] },
      { area: "Membership plans", items: ["View plans"] },
      { area: "Payments & dues", items: ["Record payments", "Collect dues", "Send dues reminders"] },
      { area: "Attendance", items: ["Check members in and out, view history"] },
      { area: "Dashboard", items: ["View their branch's dashboard"] },
    ],
    note: "Can't write off dues, invite staff, or create branches.",
  },
  {
    role: "trainer",
    label: "Trainer",
    scope: "Member-facing role at one branch",
    tone: "orange",
    groups: [
      { area: "Members", items: ["View members", "Add notes"] },
      { area: "Membership plans", items: ["View plans"] },
      { area: "Payments & dues", items: ["View payments and dues", "Send dues reminders"] },
      { area: "Attendance", items: ["Check members in and out, view history"] },
      { area: "Dashboard", items: ["View their branch's dashboard"] },
    ],
    note: "Can't create, edit, freeze or renew members, or record payments.",
  },
  {
    role: "accountant",
    label: "Accountant",
    scope: "Finance-focused role at one branch",
    tone: "orange",
    groups: [
      { area: "Members", items: ["View members"] },
      { area: "Membership plans", items: ["View plans"] },
      { area: "Payments & dues", items: ["Record payments", "Collect dues", "Send dues reminders"] },
      { area: "Attendance", items: ["View attendance"] },
      { area: "Dashboard", items: ["View their branch's dashboard"] },
    ],
    note: "Can't write off dues, edit members, or invite staff.",
  },
  {
    role: "member",
    label: "Member",
    scope: "Self-service only — one member's own account",
    tone: "gray",
    groups: [
      { area: "Member app", items: ["View their own profile, attendance and payment history", "View available plans", "Renew their own membership", "Request a freeze"] },
    ],
    note: "No access to the staff portal at all.",
  },
];

export default function RolesPage() {
  return (
    <>
      <div>
        <h1 className="text-3xl">Roles & permissions</h1>
        <p className="text-muted">A reference for what each role can and can&apos;t do. This page is informational only — permissions are enforced by the backend, not changed here.</p>
      </div>

      <div className="flex flex-wrap gap-5">
        {ROLES.map((r) => (
          <Card key={r.role} className="flex-1 basis-[320px]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl">{r.label}</h2>
              <Badge tone={r.tone}>{r.role}</Badge>
            </div>
            <p className="text-sm text-muted">{r.scope}</p>

            {r.groups.map((g) => (
              <div key={g.area} className="flex flex-col gap-1">
                <p className="text-sm font-semibold">{g.area}</p>
                <ul className="flex flex-col gap-0.5 pl-4 list-disc text-sm text-muted">
                  {g.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}

            {r.note && <p className="text-xs text-muted border-t border-line pt-2.5">{r.note}</p>}
          </Card>
        ))}
      </div>
    </>
  );
}
