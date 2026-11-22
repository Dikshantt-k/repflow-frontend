"use client";

import { useEffect, useState } from "react";
import { meApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { hasModule } from "@/lib/modules";
import { daysLeftLabel, daysLeft, formatDate, formatPaise, initials } from "@/lib/format";
import { Button, Field, Modal, Select, Toast, cx } from "@/components/ui";
import { PageHeader, PageSpinner, ProgressBar, Tile, membershipRemainingPct } from "@/components/member-ui";
import { IconReceipt } from "@/components/icons";
import type { MeMemberSummary, Payment, PTPackage } from "@/types/api";

const FREEZE_REASONS = [
  { value: "travel", label: "Travel" },
  { value: "medical", label: "Medical" },
  { value: "exams", label: "Exams" },
  { value: "other", label: "Other" },
] as const;

function PtCard({ pkg }: { pkg: PTPackage }) {
  const used = pkg.sessions.length;
  const left = pkg.totalSessions - used;
  return (
    <Tile className="gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-sans text-lg font-bold">Personal training</h2>
          <p className="text-sm text-muted">{pkg.name}</p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-accent-soft text-accent-ink text-xs font-semibold whitespace-nowrap">
          {left} {left === 1 ? "session" : "sessions"} left
        </span>
      </div>
      <div className="mt-auto flex items-baseline gap-2">
        <span className="text-[34px] font-bold leading-none">{used}</span>
        <span className="text-sm text-muted">of {pkg.totalSessions} sessions used</span>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: Math.min(pkg.totalSessions, 40) }, (_, i) => (
          <span key={i} className={cx("h-1.5 flex-1 rounded-full", i < used ? "bg-line" : "bg-accent")} />
        ))}
      </div>
    </Tile>
  );
}

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

  if (!data) return <PageSpinner />;

  const { member, membership, branch } = data;
  const activePt = (ptPackages ?? []).filter((p) => p.status === "active");
  const remainingPct = membership ? membershipRemainingPct(membership.startDate, membership.endDate) : 0;
  const ended = membership ? daysLeft(membership.endDate) < 0 : false;

  return (
    <>
      <PageHeader eyebrow={`Member since ${formatDate(member.createdAt, { month: "short", year: "numeric" })}`} title="Profile" />

      <Tile className="flex-row items-center gap-4">
        <span className="w-16 h-16 flex-none rounded-full bg-accent-soft text-accent-ink flex items-center justify-center text-xl font-bold">
          {initials(member.firstName, member.lastName)}
        </span>
        <div className="min-w-0">
          <h2 className="font-sans text-xl sm:text-2xl font-bold truncate">
            {member.firstName} {member.lastName}
          </h2>
          <p className="text-sm text-muted truncate">{[member.phone, branch?.name].filter(Boolean).join(" · ")}</p>
        </div>
      </Tile>

      <div className="grid gap-3 lg:grid-cols-2">
        <Tile className="gap-3">
          <h2 className="font-sans text-lg font-bold">Membership</h2>
          <dl className="grid grid-cols-[88px_1fr] gap-y-2 text-sm">
            <dt className="text-muted">Plan</dt>
            <dd className="font-semibold">{membership?.planName ?? "—"}</dd>
            <dt className="text-muted">{ended ? "Ended" : "Ends"}</dt>
            <dd className="font-semibold">{membership ? formatDate(membership.endDate) : "—"}</dd>
            <dt className="text-muted">Branch</dt>
            <dd className="font-semibold">{branch?.name ?? "—"}</dd>
          </dl>
          {membership && (
            <div className="flex flex-col gap-1.5 mt-1">
              <ProgressBar pct={remainingPct} />
              <span className={cx("text-xs", ended ? "text-warn" : "text-muted")}>{daysLeftLabel(membership.endDate)}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setFreezeOpen(true)}
            className="mt-auto min-h-[44px] rounded-full border border-line font-semibold text-sm hover:border-ink transition"
          >
            Request a freeze
          </button>
        </Tile>

        {ptEnabled && activePt.length > 0 ? (
          <div className="flex flex-col gap-3">
            {activePt.map((p) => (
              <PtCard key={p._id} pkg={p} />
            ))}
          </div>
        ) : null}
      </div>

      <Tile className="gap-2">
        <h2 className="font-sans text-lg font-bold">Receipts</h2>
        {!payments ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted">No payments yet.</p>
        ) : (
          <ul className="flex flex-col">
            {payments.map((p) => (
              <li key={p._id} className="flex items-center gap-3 py-3 border-t border-line first:border-0">
                <span className="w-10 h-10 flex-none rounded-[12px] bg-bg text-muted flex items-center justify-center">
                  <IconReceipt size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{p.description}</div>
                  <div className="text-xs text-muted">
                    {formatDate(p.date)} · {p.receiptNo}
                  </div>
                </div>
                <span className="font-bold whitespace-nowrap">{formatPaise(p.amountPaidPaise)}</span>
              </li>
            ))}
          </ul>
        )}
      </Tile>

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

      <div className="[&>div]:bottom-24 md:[&>div]:bottom-6">
        <Toast message={toast} />
      </div>
    </>
  );
}
