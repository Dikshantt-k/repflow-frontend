"use client";

import { useEffect, useState } from "react";
import { franchiseesApi, ApiError } from "@/lib/api";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Spinner, Toast } from "@/components/ui";
import type { FranchiseeRow, Network } from "@/types/api";

export default function FranchiseesPage() {
  const [franchisees, setFranchisees] = useState<FranchiseeRow[] | null>(null);
  const [network, setNetwork] = useState<Network | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function load() {
    franchiseesApi.list().then((res) => setFranchisees(res.franchisees));
    franchiseesApi.network().then(setNetwork);
  }

  useEffect(load, []);

  async function invite() {
    setError(null);
    setBusy(true);
    try {
      await franchiseesApi.invite(name, email);
      setOpen(false);
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

  async function remove(f: FranchiseeRow) {
    if (!confirm(`Remove franchisee "${f.name}"? Their branches and staff access will be unlinked.`)) return;
    await franchiseesApi.remove(f._id);
    load();
  }

  if (!franchisees || !network) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Franchisees</h1>
        <Button variant="primary" onClick={() => setOpen(true)}>
          + Invite franchisee
        </Button>
      </div>

      <Card>
        {franchisees.length === 0 ? (
          <EmptyState>No franchisees invited yet.</EmptyState>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-sm text-muted">
                <th className="p-3 bg-line2 rounded-l-lg">Franchisee</th>
                <th className="p-3 bg-line2">Owner</th>
                <th className="p-3 bg-line2">Status</th>
                <th className="p-3 bg-line2 rounded-r-lg"></th>
              </tr>
            </thead>
            <tbody>
              {franchisees.map((f) => (
                <tr key={f._id} className="border-t border-line2">
                  <td className="p-3 font-semibold">{f.name}</td>
                  <td className="p-3">{f.owner?.email ?? "—"}</td>
                  <td className="p-3">
                    <Badge tone={f.status === "active" ? "green" : "orange"}>{f.status === "active" ? "Active" : "Invited"}</Badge>
                  </td>
                  <td className="p-3 text-right">
                    <button type="button" className="text-sm text-warn font-semibold" onClick={() => remove(f)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <h2 className="text-xl">Network structure</h2>
        {network.companyBranches.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-muted">Company-owned branches</p>
            <ul className="flex flex-col gap-1.5">
              {network.companyBranches.map((b) => (
                <li key={b.id} className="flex justify-between px-3 py-2 rounded-lg bg-bg">
                  <span>{b.name}</span>
                  <span className="text-muted">{b.memberCount} members</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {network.franchisees.map((f) => (
          <div key={f.id} className="border border-line rounded-xl p-3.5 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold">{f.name}</span>
              <Badge tone={f.status === "active" ? "green" : "gray"}>{f.status}</Badge>
            </div>
            {f.branches.length === 0 ? (
              <p className="text-sm text-muted">No branches added yet.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {f.branches.map((b) => (
                  <li key={b.id} className="flex justify-between px-3 py-2 rounded-lg bg-bg">
                    <span>{b.name}</span>
                    <span className="text-muted">{b.memberCount} members</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Invite a franchisee">
        <Field label="Franchisee name" hint="e.g. the owner's name or their area">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Owner's email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {error && <p className="text-sm font-semibold text-warn">{error}</p>}
        <Button variant="primary" disabled={!name || !email || busy} onClick={invite}>
          {busy ? "Inviting…" : "Invite"}
        </Button>
      </Modal>

      <Toast message={toast} />
    </>
  );
}
