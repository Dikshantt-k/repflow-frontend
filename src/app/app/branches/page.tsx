"use client";

import { useEffect, useState } from "react";
import { branchesApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button, Card, EmptyState, Field, Input, Modal, Spinner } from "@/components/ui";
import type { Branch } from "@/types/api";

export default function BranchesPage() {
  const { context } = useAuth();
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    branchesApi.list().then((res) => setBranches(res.branches));
  }

  useEffect(load, []);

  const canAdd = context?.role === "org_owner" || context?.role === "franchise_owner";

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await branchesApi.create(name, address || undefined);
      setOpen(false);
      setName("");
      setAddress("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add that branch.");
    } finally {
      setBusy(false);
    }
  }

  if (!branches) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Branches</h1>
        {canAdd && (
          <Button variant="primary" onClick={() => setOpen(true)}>
            + Add branch
          </Button>
        )}
      </div>

      <Card>
        {branches.length === 0 ? (
          <EmptyState>No branches yet.</EmptyState>
        ) : (
          <ul className="flex flex-col">
            {branches.map((b) => (
              <li key={b._id} className="flex justify-between py-2.5 border-t border-line2 first:border-0">
                <div>
                  <p className="font-semibold">{b.name}</p>
                  <p className="text-sm text-muted">{b.address ?? "No address on file"}</p>
                </div>
                <span className="text-sm text-muted self-center">{b.code}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add branch">
        <Field label="Branch name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Thane West" />
        </Field>
        <Field label="Address">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional" />
        </Field>
        {error && <p className="text-sm font-semibold text-warn">{error}</p>}
        <Button variant="primary" disabled={!name.trim() || busy} onClick={submit}>
          {busy ? "Adding…" : "Add branch"}
        </Button>
      </Modal>
    </>
  );
}
