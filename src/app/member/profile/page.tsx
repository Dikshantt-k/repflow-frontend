"use client";

import { useEffect, useState } from "react";
import { meApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { hasModule } from "@/lib/modules";
import { formatDate, formatPaise, initials } from "@/lib/format";
import { Avatar, Badge, Button, Card, Field, Modal, Select, Spinner } from "@/components/ui";
import type { MeMemberSummary, Payment, PTPackage } from "@/types/api";

const FREEZE_REASONS = [
  { value: "travel", label: "Travel" },
  { value: "medical", label: "Medical" },
  { value: "exams", label: "Exams" },
  { value: "other", label: "Other" },
] as const;

export default function MemberProfilePage() {
  const { context } = useAuth();
  const ptEnabled = hasModule(context?.org?.modules, "personal_training");
  const [data, setData] = useState<MeMemberSummary | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [ptPackages, setPtPackages] = useState<PTPackage[] | null>(null);
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [days, setDays] = useState("7");
  const [reason, setReason] = useState<(typeof FREEZE_REASONS)[number]["value"]>("travel");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function load() {
    meApi.summary().then(setData);
    meApi.payments().then((res) => setPayments(res.payments));
    if (ptEnabled) meApi.pt().then((res) => setPtPackages(res.packages));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount; ptEnabled doesn't change mid-session
  useEffect(load, []);

  async function submitFreeze() {
    setError(null);
    setBusy(true);
    try {
      await meApi.freezeRequest({ fromDate: new Date().toISOString(), days: Number(days), reason });
      setFreezeOpen(false);
      setToast("Freeze request sent.");
      setTimeout(() => setToast(null), 3000);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't request a freeze.");
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const { member, membership, branch } = data;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3.5">
        <Avatar size="xl" label={initials(member.firstName, member.lastName)} />
        <div>
          <h1 className="text-2xl">
            {member.firstName} {member.lastName}
          </h1>
          <p className="text-muted">{member.phone}</p>
        </div>
      </div>

      <Card>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted">Plan</dt>
          <dd>{membership?.planName ?? "—"}</dd>
          <dt className="text-muted">Ends</dt>
          <dd>{membership ? formatDate(membership.endDate) : "—"}</dd>
          <dt className="text-muted">Branch</dt>
          <dd>{branch?.name ?? "—"}</dd>
        </dl>
        <Button onClick={() => setFreezeOpen(true)}>Request a freeze</Button>
      </Card>

      {ptPackages && ptPackages.some((p) => p.status === "active") && (
        <Card>
          <h2 className="text-lg">Personal training</h2>
          <ul className="flex flex-col">
            {ptPackages
              .filter((p) => p.status === "active")
              .map((p) => (
                <li key={p._id} className="flex justify-between items-center py-2 border-t border-line2 first:border-0 text-sm">
                  <span>{p.name}</span>
                  <Badge tone="blue">{p.totalSessions - p.sessions.length} sessions left</Badge>
                </li>
              ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="text-lg">Receipts</h2>
        {!payments || payments.length === 0 ? (
          <p className="text-sm text-muted">No payments yet.</p>
        ) : (
          <ul className="flex flex-col">
            {payments.map((p) => (
              <li key={p._id} className="flex justify-between py-2 border-t border-line2 text-sm">
                <span>
                  {p.description}
                  <br />
                  <span className="text-muted">{formatDate(p.date)}</span>
                </span>
                <span className="font-semibold">{formatPaise(p.amountPaidPaise)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={freezeOpen} onClose={() => setFreezeOpen(false)} title="Request a freeze">
        <Field label="Number of days">
          <input
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="min-h-[44px] px-3 rounded-[10px] border border-line bg-surface w-full"
          />
        </Field>
        <Field label="Reason">
          <Select value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
            {FREEZE_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
        {error && <p className="text-sm font-semibold text-warn">{error}</p>}
        <Button variant="primary" disabled={busy} onClick={submitFreeze}>
          {busy ? "Sending…" : "Request freeze"}
        </Button>
      </Modal>

      {toast && <div className="fixed left-1/2 bottom-24 -translate-x-1/2 bg-ink text-bg px-4 py-2 rounded-xl text-sm font-semibold">{toast}</div>}
    </div>
  );
}
