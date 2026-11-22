"use client";

import { useEffect, useState } from "react";
import { branchesApi, leadsApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Pill, Select, Spinner } from "@/components/ui";
import type { Branch, Lead, LeadSource, LeadStatus } from "@/types/api";

type BadgeTone = "green" | "orange" | "blue" | "gray";

const SOURCE_LABELS: Record<LeadSource, string> = {
  walk_in: "Walk-in",
  referral: "Referral",
  website: "Website",
  social_media: "Social media",
  phone: "Phone",
  other: "Other",
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  trial_scheduled: "Trial scheduled",
  trial_completed: "Trial completed",
  converted: "Converted",
  lost: "Lost",
};

const STATUS_TONES: Record<LeadStatus, BadgeTone> = {
  new: "blue",
  contacted: "blue",
  trial_scheduled: "orange",
  trial_completed: "orange",
  converted: "green",
  lost: "gray",
};

const STATUSES = Object.keys(STATUS_LABELS) as LeadStatus[];
const SOURCES = Object.keys(SOURCE_LABELS) as LeadSource[];

function assignedLabel(assignedToUserId: Lead["assignedToUserId"]): string {
  if (!assignedToUserId) return "Unassigned";
  if (typeof assignedToUserId === "string") return assignedToUserId;
  return assignedToUserId.name ?? assignedToUserId.email;
}

export default function LeadsPage() {
  const { context } = useAuth();
  const canManage = can.manageLeads(context?.role);

  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    leadsApi
      .list({ status: status === "all" ? undefined : status, pageSize: 100 })
      .then((res) => setLeads(res.leads))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load leads."));
  }

  useEffect(load, [status]);
  useEffect(() => {
    branchesApi.list().then((res) => setBranches(res.branches));
  }, []);

  async function changeStatus(lead: Lead, next: LeadStatus) {
    if (next === "lost") {
      const reason = prompt("Why was this lead lost? (optional)") ?? undefined;
      try {
        await leadsApi.update(lead._id, { status: next, lostReason: reason || undefined });
        load();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Couldn't update this lead.");
      }
      return;
    }
    try {
      await leadsApi.update(lead._id, { status: next });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update this lead.");
    }
  }

  async function remove(lead: Lead) {
    if (!confirm(`Delete the enquiry from ${lead.name}?`)) return;
    try {
      await leadsApi.remove(lead._id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete this lead.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <h1>Leads & enquiries</h1>
        {canManage && (
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            + New enquiry
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Pill active={status === "all"} onClick={() => setStatus("all")}>
          All
        </Pill>
        {STATUSES.map((s) => (
          <Pill key={s} active={status === s} onClick={() => setStatus(s)}>
            {STATUS_LABELS[s]}
          </Pill>
        ))}
      </div>

      {error && <p className="text-sm font-semibold text-warn">{error}</p>}

      <Card className="p-0 overflow-x-auto">
        {!leads ? (
          <div className="p-5">
            <Spinner />
          </div>
        ) : leads.length === 0 ? (
          <EmptyState>No enquiries match this filter.</EmptyState>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Name</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Source</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Status</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Assigned to</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Follow-up</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Notes</th>
                {canManage && <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2" />}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead._id} className="border-t border-line2">
                  <td className="p-3">
                    <span className="font-semibold">{lead.name}</span>
                    <br />
                    <span className="text-sm text-muted">{lead.phone}</span>
                  </td>
                  <td className="p-3">{SOURCE_LABELS[lead.source]}</td>
                  <td className="p-3">
                    {canManage ? (
                      <Select value={lead.status} onChange={(e) => void changeStatus(lead, e.target.value as LeadStatus)} className="min-w-[150px]">
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Badge tone={STATUS_TONES[lead.status]}>{STATUS_LABELS[lead.status]}</Badge>
                    )}
                  </td>
                  <td className="p-3 text-sm text-muted">{assignedLabel(lead.assignedToUserId)}</td>
                  <td className="p-3 text-sm text-muted">{lead.followUpDate ? formatDate(lead.followUpDate) : "—"}</td>
                  <td className="p-3 text-sm text-muted max-w-[220px] truncate">
                    {lead.status === "lost" && lead.lostReason ? `Lost: ${lead.lostReason}` : lead.notes || "—"}
                  </td>
                  {canManage && (
                    <td className="p-3 text-right">
                      <button type="button" className="text-sm text-warn font-semibold" onClick={() => void remove(lead)}>
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <CreateLeadModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        branches={branches}
        onCreated={() => {
          setCreateOpen(false);
          load();
        }}
      />
    </div>
  );
}

function CreateLeadModal({
  open,
  onClose,
  branches,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  branches: Branch[];
  onCreated: () => void;
}) {
  const [branchId, setBranchId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<LeadSource>("walk_in");
  const [followUpDate, setFollowUpDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill from the fetched branch list when the modal opens
    if (open) setBranchId((prev) => prev || branches[0]?._id || "");
  }, [open, branches]);

  async function submit() {
    setError(null);
    if (!branchId) {
      setError("Choose a branch.");
      return;
    }
    if (!name.trim() || !phone.trim()) {
      setError("Enter a name and phone number.");
      return;
    }
    setBusy(true);
    try {
      await leadsApi.create({
        branchId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        source,
        followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
        notes: notes.trim() || undefined,
      });
      setName("");
      setPhone("");
      setEmail("");
      setFollowUpDate("");
      setNotes("");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this enquiry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New enquiry">
      {branches.length > 1 && (
        <Field label="Branch">
          <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Phone">
        <Input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
      </Field>
      <Field label="Email (optional)">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Source">
        <Select value={source} onChange={(e) => setSource(e.target.value as LeadSource)}>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABELS[s]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Follow-up date (optional)">
        <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
      </Field>
      <Field label="Notes (optional)">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      {error && <p className="text-sm font-semibold text-warn">{error}</p>}
      <Button variant="primary" disabled={busy} onClick={submit}>
        {busy ? "Saving…" : "Save enquiry"}
      </Button>
    </Modal>
  );
}
