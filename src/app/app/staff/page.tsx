"use client";

import { useEffect, useState } from "react";
import { branchesApi, staffApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, Toast } from "@/components/ui";
import type { Branch, InvitableRole, StaffRow } from "@/types/api";

const ROLE_LABELS: Record<InvitableRole, string> = {
  branch_manager: "Branch manager",
  front_desk: "Front desk",
  trainer: "Trainer",
  accountant: "Accountant",
};

export default function StaffPage() {
  const { context } = useAuth();
  const [staff, setStaff] = useState<StaffRow[] | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("front_desk");
  const [branchId, setBranchId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    staffApi.list().then((res) => setStaff(res.staff));
    branchesApi.list().then((res) => {
      setBranches(res.branches);
      setBranchId((prev) => prev || res.branches[0]?._id || "");
    });
  }

  useEffect(load, []);

  const invitableRoles: InvitableRole[] =
    context?.role === "branch_manager" ? ["front_desk", "trainer", "accountant"] : ["branch_manager", "front_desk", "trainer", "accountant"];

  function branchName(id: string) {
    return branches.find((b) => b._id === id)?.name ?? id;
  }

  async function invite() {
    setError(null);
    setBusy(true);
    try {
      await staffApi.invite({ name, email, role, branchId });
      setInviteOpen(false);
      setName("");
      setEmail("");
      setToast("Invited. They'll set a password at /accept-invite.");
      setTimeout(() => setToast(null), 4000);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send that invite.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: StaffRow) {
    if (!confirm(`Remove ${row.name ?? row.email} as ${ROLE_LABELS[row.role]}?`)) return;
    await staffApi.remove(row.userId, row.branchId, row.role);
    load();
  }

  if (!staff) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Staff</h1>
        <Button variant="primary" onClick={() => setInviteOpen(true)}>
          + Invite staff
        </Button>
      </div>

      <Card>
        {staff.length === 0 ? (
          <EmptyState>No staff invited yet.</EmptyState>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-sm text-muted">
                <th className="p-3 bg-line2 rounded-l-lg">Name</th>
                <th className="p-3 bg-line2">Email</th>
                <th className="p-3 bg-line2">Role</th>
                <th className="p-3 bg-line2">Branch</th>
                <th className="p-3 bg-line2">Status</th>
                <th className="p-3 bg-line2 rounded-r-lg"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s, i) => (
                <tr key={i} className="border-t border-line2">
                  <td className="p-3 font-semibold">{s.name ?? "—"}</td>
                  <td className="p-3">{s.email}</td>
                  <td className="p-3">{ROLE_LABELS[s.role]}</td>
                  <td className="p-3">{branchName(s.branchId)}</td>
                  <td className="p-3">
                    <Badge tone={s.accepted ? "green" : "orange"}>{s.accepted ? "Active" : "Invited"}</Badge>
                  </td>
                  <td className="p-3 text-right">
                    <button type="button" className="text-sm text-warn font-semibold" onClick={() => remove(s)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite staff">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as InvitableRole)}>
            {invitableRoles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Branch">
          <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        {error && <p className="text-sm font-semibold text-warn">{error}</p>}
        <Button variant="primary" disabled={!name || !email || !branchId || busy} onClick={invite}>
          {busy ? "Inviting…" : "Invite"}
        </Button>
      </Modal>

      <Toast message={toast} />
    </>
  );
}
