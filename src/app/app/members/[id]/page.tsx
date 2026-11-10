"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ApiError, membersApi, plansApi } from "@/lib/api";
import { daysLeft, formatDate, formatPaise, initials, rupeesToPaise } from "@/lib/format";
import { Avatar, Badge, Button, Card, Field, Input, Kpi, Modal, Pill, Select, Spinner, Toast, statusBadge } from "@/components/ui";
import { ReceiptModal } from "@/components/ReceiptModal";
import type { Member, Membership, Note, Payment, Plan, Weekday, WorkoutDay, WorkoutPlan } from "@/types/api";

type Tab = "overview" | "payments" | "notes" | "workout";

const WEEKDAY_ORDER: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WEEKDAY_LABELS: Record<Weekday, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

function emptyWeek(): WorkoutDay[] {
  return WEEKDAY_ORDER.map((weekday) => ({ weekday, exercises: [] }));
}

let tempExerciseId = 0;
function nextTempExerciseId(): string {
  tempExerciseId += 1;
  return `new-${tempExerciseId}`;
}

const REASONS: Array<{ value: "travel" | "medical" | "exams" | "other"; label: string }> = [
  { value: "travel", label: "Travel" },
  { value: "medical", label: "Medical" },
  { value: "exams", label: "Exams" },
  { value: "other", label: "Other" },
];

function membershipStatusBadge(status: Membership["status"]) {
  return statusBadge(status);
}

function MemberDetailInner() {
  const { id } = useParams<{ id: string }>();
  const initialToast = useSearchParams().get("toast");

  const [member, setMember] = useState<Member | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("overview");
  const [toast, setToast] = useState<string | null>(initialToast);
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);

  const [freezeOpen, setFreezeOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await membersApi.get(id);
      setMember(res.member);
      setMemberships(res.memberships);
      setPayments(res.payments);
      setNotes(res.notes);
      const workoutRes = await membersApi.getWorkout(id);
      setWorkoutPlan(workoutRes.plan);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Couldn't load this member.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount/param-change is intentional
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const latestMembership = memberships[0] ?? null;
  const totalPaid = payments.reduce((sum, p) => sum + p.amountPaidPaise, 0);

  if (loading && !member) {
    return <Spinner />;
  }

  if (loadError && !member) {
    return <p className="text-sm font-semibold text-warn">{loadError}</p>;
  }

  if (!member) return null;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-muted">
        <Link href="/app/members" className="font-semibold">
          Members
        </Link>{" "}
        / {member.firstName} {member.lastName ?? ""}
      </p>

      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <Avatar size="xl" label={initials(member.firstName, member.lastName)} />
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl">
              {member.firstName} {member.lastName ?? ""}
            </h1>
            <p className="text-muted">
              {member.memberCode} · {member.phone}
            </p>
            <div className="flex gap-2">
              {statusBadge(member.status)}
              {latestMembership && <Badge tone="blue">{latestMembership.planName}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex gap-2.5">
          <Button onClick={() => setFreezeOpen(true)}>Freeze</Button>
          <Button variant="primary" onClick={() => setRenewOpen(true)}>
            Renew plan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Kpi
          label="Plan ends"
          value={latestMembership ? formatDate(latestMembership.endDate) : "—"}
          sub={latestMembership ? `${daysLeft(latestMembership.endDate)} days left` : undefined}
        />
        <Kpi label="Total paid" value={formatPaise(totalPaid)} sub={`since ${formatDate(member.createdAt)}`} />
        <Kpi label="Dues" value={formatPaise(member.duesPaise)} warn={member.duesPaise > 0} />
      </div>

      <div className="flex gap-1 border-b border-line overflow-x-auto">
        {(
          [
            ["overview", "Overview"],
            ["payments", "Payments"],
            ["notes", "Notes"],
            ["workout", "Workout plan"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`min-h-[44px] px-4 border-b-[3px] font-semibold whitespace-nowrap ${
              tab === key ? "border-accent text-ink" : "border-transparent text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="flex flex-col gap-5">
          <Card>
            <h2 className="text-xl">Personal details</h2>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2">
              <dt className="text-muted">Date of birth</dt>
              <dd>{member.dob ? formatDate(member.dob) : "—"}</dd>
              <dt className="text-muted">Gender</dt>
              <dd className="capitalize">{member.gender?.replace(/_/g, " ") ?? "—"}</dd>
              <dt className="text-muted">Emergency contact</dt>
              <dd>
                {member.emergencyContact?.name || member.emergencyContact?.phone
                  ? `${member.emergencyContact?.name ?? ""} ${member.emergencyContact?.phone ?? ""}`.trim()
                  : "—"}
              </dd>
              <dt className="text-muted">Health notes</dt>
              <dd>{member.healthNotes || "—"}</dd>
            </dl>
          </Card>

          <Card>
            <h2 className="text-xl">Plan history</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2">Plan</th>
                    <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2">Start</th>
                    <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2">End</th>
                    <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2">Paid</th>
                    <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {memberships.map((m) => (
                    <tr key={m._id} className="border-t border-line2">
                      <td className="p-2.5">{m.planName}</td>
                      <td className="p-2.5">{formatDate(m.startDate)}</td>
                      <td className="p-2.5">{formatDate(m.endDate)}</td>
                      <td className="p-2.5">{formatPaise(m.pricePaise)}</td>
                      <td className="p-2.5">{membershipStatusBadge(m.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "payments" && (
        <Card>
          <h2 className="text-xl">Payments</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2">Receipt</th>
                  <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2">Date</th>
                  <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2">For</th>
                  <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2">Mode</th>
                  <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2">Amount</th>
                  <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id} className="border-t border-line2">
                    <td className="p-2.5">{p.receiptNo}</td>
                    <td className="p-2.5">{formatDate(p.date)}</td>
                    <td className="p-2.5">{p.description}</td>
                    <td className="p-2.5 uppercase">{p.mode}</td>
                    <td className="p-2.5">{formatPaise(p.amountPaidPaise)}</td>
                    <td className="p-2.5">
                      <Button onClick={() => setReceiptPaymentId(p._id)}>Receipt</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "notes" && (
        <Card>
          <h2 className="text-xl">Notes</h2>
          <NotesPanel memberId={id} notes={notes} onAdded={(n) => setNotes((prev) => [n, ...prev])} />
        </Card>
      )}

      {tab === "workout" && (
        <Card>
          <h2 className="text-xl">Workout plan</h2>
          <p className="text-sm text-muted">Set by a trainer. The member sees this read-only in their app and can tick off exercises as they go.</p>
          <WorkoutPlanPanel memberId={id} plan={workoutPlan} onSaved={setWorkoutPlan} />
        </Card>
      )}

      <FreezeModal
        open={freezeOpen}
        onClose={() => setFreezeOpen(false)}
        memberId={id}
        onDone={(msg) => {
          setToast(msg);
          setFreezeOpen(false);
          void load();
        }}
      />
      <RenewModal
        open={renewOpen}
        onClose={() => setRenewOpen(false)}
        memberId={id}
        onDone={(msg) => {
          setToast(msg);
          setRenewOpen(false);
          void load();
        }}
      />
      <ReceiptModal paymentId={receiptPaymentId} onClose={() => setReceiptPaymentId(null)} />
      <Toast message={toast} />
    </div>
  );
}

function NotesPanel({ memberId, notes, onAdded }: { memberId: string; notes: Note[]; onAdded: (n: Note) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res = await membersApi.addNote(memberId, text.trim());
      onAdded(res.note);
      setText("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note" onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button onClick={add} disabled={busy || !text.trim()}>
          Add note
        </Button>
      </div>
      <ul className="flex flex-col gap-2">
        {notes.length === 0 && <li className="text-muted">No notes yet.</li>}
        {notes.map((n) => (
          <li key={n._id} className="border-t border-line2 pt-2">
            <p>{n.text}</p>
            <p className="text-xs text-muted">{formatDate(n.createdAt)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WorkoutPlanPanel({ memberId, plan, onSaved }: { memberId: string; plan: WorkoutPlan | null; onSaved: (plan: WorkoutPlan) => void }) {
  const [days, setDays] = useState<WorkoutDay[]>(plan?.days.length ? plan.days : emptyWeek());
  const [dietNotes, setDietNotes] = useState(plan?.dietNotes ?? "");
  const [activeDay, setActiveDay] = useState<Weekday>("mon");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const day = days.find((d) => d.weekday === activeDay) ?? { weekday: activeDay, exercises: [] };

  function updateDay(weekday: Weekday, patch: Partial<WorkoutDay>) {
    setSaved(false);
    setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));
  }

  function addExercise() {
    updateDay(activeDay, { exercises: [...day.exercises, { _id: nextTempExerciseId(), name: "" }] });
  }

  function updateExercise(index: number, patch: Partial<WorkoutDay["exercises"][number]>) {
    const exercises = day.exercises.map((ex, i) => (i === index ? { ...ex, ...patch } : ex));
    updateDay(activeDay, { exercises });
  }

  function removeExercise(index: number) {
    updateDay(activeDay, { exercises: day.exercises.filter((_, i) => i !== index) });
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await membersApi.saveWorkout(memberId, {
        days: days.map((d) => ({
          weekday: d.weekday,
          label: d.label,
          exercises: d.exercises.filter((ex) => ex.name.trim()).map((ex) => ({ name: ex.name, sets: ex.sets, reps: ex.reps, notes: ex.notes })),
        })),
        dietNotes: dietNotes || undefined,
      });
      onSaved(res.plan);
      setDays(res.plan.days.length ? res.plan.days : emptyWeek());
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this plan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {WEEKDAY_ORDER.map((wd) => {
          const count = days.find((d) => d.weekday === wd)?.exercises.filter((e) => e.name.trim()).length ?? 0;
          return (
            <Pill key={wd} active={activeDay === wd} onClick={() => setActiveDay(wd)}>
              {WEEKDAY_LABELS[wd]}
              {count > 0 ? ` (${count})` : ""}
            </Pill>
          );
        })}
      </div>

      <Field label="Day label (optional)">
        <Input
          value={day.label ?? ""}
          onChange={(e) => updateDay(activeDay, { label: e.target.value })}
          placeholder="e.g. Push day, Legs, Rest"
        />
      </Field>

      <div className="flex flex-col gap-2">
        {day.exercises.map((ex, i) => (
          <div key={ex._id} className="flex flex-wrap gap-2 items-end border-t border-line2 pt-2 first:border-0 first:pt-0">
            <Field label="Exercise">
              <Input value={ex.name} onChange={(e) => updateExercise(i, { name: e.target.value })} className="w-44" />
            </Field>
            <Field label="Sets">
              <Input
                inputMode="numeric"
                value={ex.sets ?? ""}
                onChange={(e) => updateExercise(i, { sets: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : undefined })}
                className="w-16"
              />
            </Field>
            <Field label="Reps">
              <Input value={ex.reps ?? ""} onChange={(e) => updateExercise(i, { reps: e.target.value })} placeholder="e.g. 12" className="w-20" />
            </Field>
            <Field label="Notes">
              <Input value={ex.notes ?? ""} onChange={(e) => updateExercise(i, { notes: e.target.value })} className="w-40" />
            </Field>
            <Button onClick={() => removeExercise(i)}>Remove</Button>
          </div>
        ))}
        {day.exercises.length === 0 && <p className="text-sm text-muted">No exercises for {WEEKDAY_LABELS[activeDay]} yet.</p>}
        <Button onClick={addExercise}>+ Add exercise</Button>
      </div>

      <Field label="Diet notes (applies to the whole plan)">
        <textarea
          value={dietNotes}
          onChange={(e) => {
            setDietNotes(e.target.value);
            setSaved(false);
          }}
          rows={3}
          className="px-3 py-2 rounded-[10px] border border-line bg-surface text-ink w-full outline-none focus:border-accent"
        />
      </Field>

      {error && <p className="text-sm font-semibold text-warn">{error}</p>}
      <Button variant="primary" disabled={busy} onClick={save}>
        {busy ? "Saving…" : saved ? "Saved" : "Save plan"}
      </Button>
    </div>
  );
}

function FreezeModal({ open, onClose, memberId, onDone }: { open: boolean; onClose: () => void; memberId: string; onDone: (msg: string) => void }) {
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState("7");
  const [reason, setReason] = useState<"travel" | "medical" | "exams" | "other">("travel");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await membersApi.freeze(memberId, { fromDate, days: Number(days), reason });
      onDone(`Membership frozen for ${days} days. New end date: ${formatDate(res.membership.endDate)}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't freeze this membership.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Freeze membership">
      <Field label="Freeze from">
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
      </Field>
      <Field label="Number of days">
        <Input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} />
      </Field>
      <Field label="Reason">
        <Select value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      {error && <p className="text-sm font-semibold text-warn">{error}</p>}
      <Button variant="primary" disabled={busy || !days} onClick={submit}>
        {busy ? "Saving…" : "Freeze membership"}
      </Button>
    </Modal>
  );
}

function RenewModal({ open, onClose, memberId, onDone }: { open: boolean; onClose: () => void; memberId: string; onDone: (msg: string) => void }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState("");
  const [discountRupees, setDiscountRupees] = useState("");
  const [mode, setMode] = useState<"upi" | "cash" | "card">("upi");
  const [amountPaidRupees, setAmountPaidRupees] = useState("");
  const [gstInvoice, setGstInvoice] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    plansApi.list().then((res) => setPlans(res.plans.filter((p) => p.status === "shown")));
  }, [open]);

  const selectedPlan = useMemo(() => plans.find((p) => p._id === planId) ?? null, [plans, planId]);
  const discountPaise = rupeesToPaise(Number(discountRupees) || 0);
  const totalPaise = selectedPlan ? Math.max(selectedPlan.pricePaise - discountPaise, 0) : 0;

  useEffect(() => {
    // Prefill the amount field from the computed total each time the plan/discount changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAmountPaidRupees(totalPaise > 0 ? String(totalPaise / 100) : "");
  }, [totalPaise]);

  async function submit() {
    if (!selectedPlan) {
      setError("Choose a plan.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const amountPaidPaise = rupeesToPaise(Number(amountPaidRupees) || 0);
      const res = await membersApi.renew(memberId, { planId: selectedPlan._id, discountPaise, mode, amountPaidPaise, gstInvoice });
      onDone(`Renewed. Receipt ${res.receiptNo}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't renew this membership.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Renew plan">
      <Field label="Plan">
        <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
          <option value="">Choose a plan</option>
          {plans.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name} — {formatPaise(p.pricePaise)}
            </option>
          ))}
        </Select>
      </Field>
      {selectedPlan && (
        <>
          <Field label="Discount">
            <Input inputMode="decimal" value={discountRupees} onChange={(e) => setDiscountRupees(e.target.value.replace(/[^\d.]/g, ""))} />
          </Field>
          <Field label="Payment mode">
            <div className="flex gap-2">
              {(["upi", "cash", "card"] as const).map((m) => (
                <Pill key={m} active={mode === m} onClick={() => setMode(m)}>
                  {m.toUpperCase()}
                </Pill>
              ))}
            </div>
          </Field>
          <Field label="Amount paid now">
            <Input inputMode="decimal" value={amountPaidRupees} onChange={(e) => setAmountPaidRupees(e.target.value.replace(/[^\d.]/g, ""))} />
          </Field>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatPaise(totalPaise)}</span>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={gstInvoice} onChange={(e) => setGstInvoice(e.target.checked)} className="w-[18px] h-[18px] accent-accent" />
            GST invoice
          </label>
        </>
      )}
      {error && <p className="text-sm font-semibold text-warn">{error}</p>}
      <Button variant="primary" disabled={busy || !selectedPlan} onClick={submit}>
        {busy ? "Saving…" : "Renew and record payment"}
      </Button>
    </Modal>
  );
}

export default function MemberDetailPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <MemberDetailInner />
    </Suspense>
  );
}
