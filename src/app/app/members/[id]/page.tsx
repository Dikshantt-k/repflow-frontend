"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ApiError, membersApi, paymentsApi, plansApi, staffApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { collectUpiPayment, loadRazorpayScript } from "@/lib/razorpay";
import { can } from "@/lib/permissions";
import { hasModule } from "@/lib/modules";
import { daysLeft, formatDate, formatPaise, initials, rupeesToPaise } from "@/lib/format";
import { Avatar, Badge, Button, Card, Field, Input, Kpi, Modal, Pill, Select, Spinner, Toast, statusBadge } from "@/components/ui";
import { ReceiptModal } from "@/components/ReceiptModal";
import type {
  DietDay,
  DietPlan,
  FitnessLog,
  FitnessMeasurements,
  FoodItem,
  MealType,
  Member,
  Membership,
  Note,
  Payment,
  Plan,
  PTPackage,
  StaffRow,
  Weekday,
  WorkoutDay,
  WorkoutPlan,
} from "@/types/api";

type Tab = "overview" | "payments" | "notes" | "workout" | "diet" | "pt" | "progress";

const WEEKDAY_ORDER: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WEEKDAY_LABELS: Record<Weekday, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };

function emptyWeek(): WorkoutDay[] {
  return WEEKDAY_ORDER.map((weekday) => ({ weekday, exercises: [] }));
}

function emptyDietWeek(): DietDay[] {
  return WEEKDAY_ORDER.map((weekday) => ({ weekday, meals: MEAL_TYPES.map((type) => ({ type, items: [] })) }));
}

/** Keeps a decimal-input field always parseable — strips non-digits and any dot past the first. */
function sanitizeDecimalInput(v: string): string {
  const cleaned = v.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
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
  const { context } = useAuth();
  const showFinancials = context?.role !== "trainer";
  const initialToast = useSearchParams().get("toast");

  const [member, setMember] = useState<Member | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [ptPackages, setPtPackages] = useState<PTPackage[]>([]);
  const [fitnessLogs, setFitnessLogs] = useState<FitnessLog[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
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
      const dietRes = await membersApi.getDiet(id);
      setDietPlan(dietRes.plan);
      const ptRes = await membersApi.listPt(id);
      setPtPackages(ptRes.packages);
      const fitnessRes = await membersApi.listFitness(id);
      setFitnessLogs(fitnessRes.logs);
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

  useEffect(() => {
    staffApi.list().then((res) => setStaff(res.staff));
  }, []);

  async function reassignTrainer(trainerUserId: string) {
    try {
      const res = await membersApi.update(id, { trainerUserId });
      setMember(res.member);
      setToast("Trainer updated.");
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : "Couldn't update the trainer.");
    }
  }

  const latestMembership = memberships[0] ?? null;
  const totalPaid = payments.reduce((sum, p) => sum + p.amountPaidPaise, 0);
  const branchTrainers = staff.filter((s) => s.role === "trainer" && member && s.branchId === member.branchId);
  const isMyMember = context?.role !== "trainer" || member?.trainerUserId === context?.userId;

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
        {(can.freezeMember(context?.role) || can.renewMember(context?.role)) && (
          <div className="flex gap-2.5">
            {can.freezeMember(context?.role) && <Button onClick={() => setFreezeOpen(true)}>Freeze</Button>}
            {can.renewMember(context?.role) && (
              <Button variant="primary" onClick={() => setRenewOpen(true)}>
                Renew plan
              </Button>
            )}
          </div>
        )}
      </div>

      <div className={`grid grid-cols-1 ${showFinancials ? "sm:grid-cols-3" : "sm:grid-cols-1"} gap-3.5`}>
        <Kpi
          label="Plan ends"
          value={latestMembership ? formatDate(latestMembership.endDate) : "—"}
          sub={latestMembership ? `${daysLeft(latestMembership.endDate)} days left` : undefined}
        />
        {showFinancials && (
          <>
            <Kpi label="Total paid" value={formatPaise(totalPaid)} sub={`since ${formatDate(member.createdAt)}`} />
            <Kpi label="Dues" value={formatPaise(member.duesPaise ?? 0)} warn={(member.duesPaise ?? 0) > 0} />
          </>
        )}
      </div>

      <div className="flex gap-1 border-b border-line overflow-x-auto">
        {(
          [
            ["overview", "Overview", undefined],
            ["payments", "Payments", undefined],
            ["notes", "Notes", undefined],
            ["workout", "Workout plan", "workout_diet"],
            ["diet", "Diet plan", "workout_diet"],
            ["pt", "Personal training", "personal_training"],
            ["progress", "Progress", "fitness_progress"],
          ] as const
        )
          .filter(([, , moduleKey]) => !moduleKey || hasModule(context?.org?.modules, moduleKey))
          .filter(([key]) => isMyMember || !(["workout", "diet", "pt", "progress"] as Tab[]).includes(key))
          .filter(([key]) => showFinancials || key !== "payments")
          .map(([key, label]) => (
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
              <dt className="text-muted">Trainer</dt>
              <dd>
                {can.editMember(context?.role) && branchTrainers.length > 0 ? (
                  <Select
                    value={member.trainerUserId ?? ""}
                    onChange={(e) => e.target.value && void reassignTrainer(e.target.value)}
                    className="min-w-[180px]"
                  >
                    {!member.trainerUserId && <option value="">Choose a trainer</option>}
                    {branchTrainers.map((t) => (
                      <option key={t.userId} value={t.userId}>
                        {t.name ?? t.email}
                      </option>
                    ))}
                  </Select>
                ) : (
                  (staff.find((s) => s.userId === member.trainerUserId)?.name ?? "—")
                )}
              </dd>
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
                    {/* Trainers never see prices; the API strips them too (Round 1, #1) */}
                    {showFinancials && <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2">Paid</th>}
                    <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {memberships.map((m) => (
                    <tr key={m._id} className="border-t border-line2">
                      <td className="p-2.5">{m.planName}</td>
                      <td className="p-2.5">{formatDate(m.startDate)}</td>
                      <td className="p-2.5">{formatDate(m.endDate)}</td>
                      {showFinancials && <td className="p-2.5">{formatPaise(m.pricePaise ?? 0)}</td>}
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
          <NotesPanel
            memberId={id}
            notes={notes}
            onAdded={(n) => setNotes((prev) => [n, ...prev])}
            canAdd={can.addMemberNote(context?.role)}
          />
        </Card>
      )}

      {tab === "workout" && (
        <Card>
          <h2 className="text-xl">Workout plan</h2>
          <p className="text-sm text-muted">Set by a trainer. The member sees this read-only in their app and can tick off exercises as they go.</p>
          {can.editWorkoutPlan(context?.role) ? (
            <WorkoutPlanPanel memberId={id} plan={workoutPlan} onSaved={setWorkoutPlan} />
          ) : (
            <WorkoutPlanReadOnly plan={workoutPlan} />
          )}
        </Card>
      )}

      {tab === "diet" && (
        <Card>
          <h2 className="text-xl">Diet plan</h2>
          <p className="text-sm text-muted">Set by a trainer. The member sees this read-only in their app.</p>
          {can.editDietPlan(context?.role) ? (
            <DietPlanPanel memberId={id} plan={dietPlan} onSaved={setDietPlan} />
          ) : (
            <DietPlanReadOnly plan={dietPlan} />
          )}
        </Card>
      )}

      {tab === "pt" && (
        <Card>
          <h2 className="text-xl">Personal training</h2>
          <PtPanel
            memberId={id}
            packages={ptPackages}
            onChanged={setPtPackages}
            canSell={can.sellPtPackage(context?.role)}
            canLog={can.logPtSession(context?.role)}
            trainerName={staff.find((s) => s.userId === member.trainerUserId)?.name ?? staff.find((s) => s.userId === member.trainerUserId)?.email}
            hasTrainer={!!member.trainerUserId}
          />
        </Card>
      )}

      {tab === "progress" && (
        <Card>
          <h2 className="text-xl">Fitness progress</h2>
          <FitnessPanel memberId={id} logs={fitnessLogs} onChanged={setFitnessLogs} canLog={can.logFitness(context?.role)} />
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
        duesPaise={member.duesPaise ?? 0}
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

function NotesPanel({
  memberId,
  notes,
  onAdded,
  canAdd,
}: {
  memberId: string;
  notes: Note[];
  onAdded: (n: Note) => void;
  canAdd: boolean;
}) {
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
      {canAdd && (
        <div className="flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note" onKeyDown={(e) => e.key === "Enter" && add()} />
          <Button onClick={add} disabled={busy || !text.trim()}>
            Add note
          </Button>
        </div>
      )}
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

function WorkoutPlanReadOnly({ plan }: { plan: WorkoutPlan | null }) {
  const days = plan?.days.filter((d) => d.exercises.length > 0) ?? [];

  return (
    <div className="flex flex-col gap-4">
      {days.length === 0 && <p className="text-sm text-muted">No workout plan set yet.</p>}
      {days.map((d) => (
        <div key={d.weekday} className="border-t border-line2 pt-3 first:border-0 first:pt-0">
          <p className="font-semibold">{WEEKDAY_LABELS[d.weekday]}{d.label ? ` — ${d.label}` : ""}</p>
          <ul className="flex flex-col gap-1 mt-1">
            {d.exercises.map((ex) => (
              <li key={ex._id} className="text-sm">
                {ex.name}
                {ex.sets ? ` · ${ex.sets} sets` : ""}
                {ex.reps ? ` · ${ex.reps}` : ""}
                {ex.notes ? ` · ${ex.notes}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function WorkoutPlanPanel({ memberId, plan, onSaved }: { memberId: string; plan: WorkoutPlan | null; onSaved: (plan: WorkoutPlan) => void }) {
  const [days, setDays] = useState<WorkoutDay[]>(plan?.days.length ? plan.days : emptyWeek());
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

      {error && <p className="text-sm font-semibold text-warn">{error}</p>}
      <Button variant="primary" disabled={busy} onClick={save}>
        {busy ? "Saving…" : saved ? "Saved" : "Save plan"}
      </Button>
    </div>
  );
}

function DietPlanReadOnly({ plan }: { plan: DietPlan | null }) {
  const days = plan?.days.filter((d) => d.meals.some((m) => m.items.length > 0)) ?? [];

  return (
    <div className="flex flex-col gap-4">
      {days.length === 0 && <p className="text-sm text-muted">No diet plan set yet.</p>}
      {days.map((d) => (
        <div key={d.weekday} className="border-t border-line2 pt-3 first:border-0 first:pt-0">
          <p className="font-semibold">{WEEKDAY_LABELS[d.weekday]}</p>
          {d.meals
            .filter((m) => m.items.length > 0)
            .map((m) => (
              <div key={m.type} className="mt-1">
                <p className="text-sm font-semibold text-muted">{MEAL_LABELS[m.type]}</p>
                <ul className="flex flex-col gap-0.5">
                  {m.items.map((item, i) => (
                    <li key={i} className="text-sm">
                      {item.name}
                      {item.quantity ? ` · ${item.quantity}` : ""}
                      {item.calories ? ` · ${item.calories} kcal` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

function DietPlanPanel({ memberId, plan, onSaved }: { memberId: string; plan: DietPlan | null; onSaved: (plan: DietPlan) => void }) {
  const [days, setDays] = useState<DietDay[]>(plan?.days.length ? plan.days : emptyDietWeek());
  const [activeDay, setActiveDay] = useState<Weekday>("mon");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const day = days.find((d) => d.weekday === activeDay) ?? { weekday: activeDay, meals: MEAL_TYPES.map((type) => ({ type, items: [] })) };

  function updateDay(weekday: Weekday, patch: Partial<DietDay>) {
    setSaved(false);
    setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));
  }

  function mealFor(type: MealType) {
    return day.meals.find((m) => m.type === type) ?? { type, items: [] as FoodItem[] };
  }

  function updateMeal(type: MealType, items: FoodItem[]) {
    const meals = MEAL_TYPES.map((t) => (t === type ? { type: t, items } : mealFor(t)));
    updateDay(activeDay, { meals });
  }

  function addItem(type: MealType) {
    updateMeal(type, [...mealFor(type).items, { name: "" }]);
  }

  function updateItem(type: MealType, index: number, patch: Partial<FoodItem>) {
    const items = mealFor(type).items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    updateMeal(type, items);
  }

  function removeItem(type: MealType, index: number) {
    updateMeal(
      type,
      mealFor(type).items.filter((_, i) => i !== index)
    );
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await membersApi.saveDiet(memberId, {
        days: days.map((d) => ({
          weekday: d.weekday,
          meals: d.meals.map((m) => ({
            type: m.type,
            items: m.items.filter((it) => it.name.trim()).map((it) => ({ name: it.name, quantity: it.quantity, calories: it.calories })),
          })),
        })),
      });
      onSaved(res.plan);
      setDays(res.plan.days.length ? res.plan.days : emptyDietWeek());
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
          const count = (days.find((d) => d.weekday === wd)?.meals ?? []).reduce(
            (sum, m) => sum + m.items.filter((it) => it.name.trim()).length,
            0
          );
          return (
            <Pill key={wd} active={activeDay === wd} onClick={() => setActiveDay(wd)}>
              {WEEKDAY_LABELS[wd]}
              {count > 0 ? ` (${count})` : ""}
            </Pill>
          );
        })}
      </div>

      {MEAL_TYPES.map((type) => (
        <div key={type} className="flex flex-col gap-2 border-t border-line2 pt-3 first:border-0 first:pt-0">
          <p className="font-semibold">{MEAL_LABELS[type]}</p>
          {mealFor(type).items.map((item, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-end">
              <Field label="Food item">
                <Input value={item.name} onChange={(e) => updateItem(type, i, { name: e.target.value })} className="w-44" />
              </Field>
              <Field label="Quantity">
                <Input
                  value={item.quantity ?? ""}
                  onChange={(e) => updateItem(type, i, { quantity: e.target.value })}
                  placeholder="e.g. 1 bowl"
                  className="w-28"
                />
              </Field>
              <Field label="Calories">
                <Input
                  inputMode="numeric"
                  value={item.calories ?? ""}
                  onChange={(e) => updateItem(type, i, { calories: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : undefined })}
                  className="w-20"
                />
              </Field>
              <Button onClick={() => removeItem(type, i)}>Remove</Button>
            </div>
          ))}
          {mealFor(type).items.length === 0 && <p className="text-sm text-muted">No items for {MEAL_LABELS[type]} yet.</p>}
          <Button onClick={() => addItem(type)}>+ Add item</Button>
        </div>
      ))}

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

function RenewModal({
  open,
  onClose,
  memberId,
  duesPaise,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  memberId: string;
  duesPaise: number;
  onDone: (msg: string) => void;
}) {
  const { context } = useAuth();
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

  useEffect(() => {
    // Preload so paying via UPI only has to await order creation inside the click handler —
    // see the matching note in member/renew/page.tsx for why this avoids a new-tab checkout.
    void loadRazorpayScript();
  }, []);

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
    const amountPaidPaise = rupeesToPaise(Number(amountPaidRupees) || 0);
    if (mode === "upi" && amountPaidPaise > 0 && amountPaidPaise < 100) {
      setError("Enter at least ₹1 to collect via UPI.");
      return;
    }
    setError(null);
    setBusy(true);
    let paid = false;
    try {
      let razorpayProof: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string } | undefined;
      if (mode === "upi" && amountPaidPaise > 0) {
        const order = await paymentsApi.createRazorpayOrder(amountPaidPaise);
        razorpayProof = await collectUpiPayment({
          order,
          orgName: context?.org?.name ?? "Repflow",
          description: `${selectedPlan.name} renewal`,
        });
        paid = true;
      }

      const res = await membersApi.renew(memberId, {
        planId: selectedPlan._id,
        discountPaise,
        mode,
        amountPaidPaise,
        gstInvoice,
        ...razorpayProof,
      });
      const extra = res.appliedToDuesPaise > 0 ? ` ${formatPaise(res.appliedToDuesPaise)} was also applied to this member's earlier dues.` : "";
      onDone(`Renewed. Receipt ${res.receiptNo}.${extra}`);
    } catch (err) {
      if (paid) {
        setError(
          `${formatPaise(amountPaidPaise)} was collected via UPI, but the renewal couldn't be saved. Don't collect again — contact support to reconcile this payment.`
        );
      } else if (err instanceof Error && err.message === "Payment cancelled.") {
        setError("Payment was cancelled. Try again when ready.");
      } else {
        setError(err instanceof ApiError ? err.message : "Couldn't renew this membership.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Renew plan">
      {duesPaise > 0 && (
        <p className="text-sm font-semibold text-warn bg-warn-soft rounded-lg px-3 py-2">
          This member also owes {formatPaise(duesPaise)} from before. Collect extra above the plan price to clear it too.
        </p>
      )}
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
        {busy ? (mode === "upi" && rupeesToPaise(Number(amountPaidRupees) || 0) > 0 ? "Opening payment…" : "Saving…") : "Renew and record payment"}
      </Button>
    </Modal>
  );
}

function PtPanel({
  memberId,
  packages,
  onChanged,
  canSell,
  canLog,
  trainerName,
  hasTrainer,
}: {
  memberId: string;
  packages: PTPackage[];
  onChanged: (packages: PTPackage[]) => void;
  canSell: boolean;
  canLog: boolean;
  trainerName?: string;
  hasTrainer: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyPackageId, setBusyPackageId] = useState<string | null>(null);

  function replace(pkg: PTPackage) {
    onChanged(packages.map((p) => (p._id === pkg._id ? pkg : p)));
  }

  async function logSession(pkg: PTPackage) {
    if (busyPackageId) return; // guards a fast double-click/tap from logging two sessions for one
    setError(null);
    setBusyPackageId(pkg._id);
    try {
      const res = await membersApi.logPtSession(memberId, pkg._id);
      replace(res.package);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't log this session.");
    } finally {
      setBusyPackageId(null);
    }
  }

  async function undoSession(pkg: PTPackage, sessionId: string) {
    setError(null);
    try {
      const res = await membersApi.deletePtSession(memberId, pkg._id, sessionId);
      replace(res.package);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't undo this session.");
    }
  }

  async function cancelPackage(pkg: PTPackage) {
    if (!confirm(`Cancel "${pkg.name}"?`)) return;
    try {
      const res = await membersApi.cancelPt(memberId, pkg._id);
      replace(res.package);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't cancel this package.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {canSell && (
        <div>
          {hasTrainer ? (
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              + New PT package
            </Button>
          ) : (
            <p className="text-sm text-muted">Assign a trainer to this member (Overview tab) before selling a PT package.</p>
          )}
        </div>
      )}
      {error && <p className="text-sm font-semibold text-warn">{error}</p>}
      {packages.length === 0 && <p className="text-sm text-muted">No PT packages yet.</p>}
      {packages.map((pkg) => {
        const remaining = pkg.totalSessions - pkg.sessions.length;
        return (
          <div key={pkg._id} className="border-t border-line2 pt-3 first:border-0 first:pt-0">
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="font-semibold">{pkg.name}</p>
                <p className="text-sm text-muted">
                  {pkg.sessions.length} of {pkg.totalSessions} used
                  {pkg.expiresAt ? ` · expires ${formatDate(pkg.expiresAt)}` : ""}
                </p>
              </div>
              <Badge tone={pkg.status === "cancelled" ? "gray" : remaining > 0 ? "blue" : "green"}>
                {pkg.status === "active" ? `${remaining} left` : pkg.status === "completed" ? "Completed" : "Cancelled"}
              </Badge>
            </div>

            {pkg.status === "active" && (canLog || canSell) && (
              <div className="flex gap-2 mt-2">
                {canLog && (
                  <Button disabled={busyPackageId === pkg._id} onClick={() => void logSession(pkg)}>
                    {busyPackageId === pkg._id ? "Logging…" : "Log session"}
                  </Button>
                )}
                {canSell && <Button onClick={() => void cancelPackage(pkg)}>Cancel package</Button>}
              </div>
            )}

            {pkg.sessions.length > 0 && (
              <ul className="flex flex-col gap-1 mt-2">
                {pkg.sessions
                  .slice()
                  .reverse()
                  .map((s) => (
                    <li key={s._id} className="flex justify-between text-sm">
                      <span>
                        {formatDate(s.date)}
                        {s.notes ? ` · ${s.notes}` : ""}
                      </span>
                      {canLog && (
                        <button type="button" className="text-warn font-semibold" onClick={() => void undoSession(pkg, s._id)}>
                          Undo
                        </button>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        );
      })}

      <CreatePtPackageModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        memberId={memberId}
        trainerName={trainerName}
        onCreated={(pkg) => {
          onChanged([pkg, ...packages]);
          setCreateOpen(false);
        }}
      />
    </div>
  );
}

function CreatePtPackageModal({
  open,
  onClose,
  memberId,
  trainerName,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  memberId: string;
  trainerName?: string;
  onCreated: (pkg: PTPackage) => void;
}) {
  const [name, setName] = useState("12 sessions");
  const [totalSessions, setTotalSessions] = useState("12");
  const [priceRupees, setPriceRupees] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("90");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    const sessions = Number(totalSessions);
    if (!name.trim() || !(sessions > 0)) {
      setError("Enter a name and a session count above 0.");
      return;
    }
    setBusy(true);
    try {
      const expiresAt = expiresInDays ? new Date(Date.now() + Number(expiresInDays) * 86_400_000).toISOString() : undefined;
      const res = await membersApi.createPt(memberId, {
        name: name.trim(),
        totalSessions: sessions,
        pricePaise: priceRupees ? rupeesToPaise(Number(priceRupees)) : undefined,
        expiresAt,
      });
      onCreated(res.package);
      setName("12 sessions");
      setTotalSessions("12");
      setPriceRupees("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create this package.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New PT package">
      {trainerName && <p className="text-sm text-muted">Trainer: {trainerName}</p>}
      <Field label="Package name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 12 sessions" />
      </Field>
      <Field label="Total sessions">
        <Input inputMode="numeric" value={totalSessions} onChange={(e) => setTotalSessions(e.target.value.replace(/\D/g, ""))} />
      </Field>
      <Field label="Price (optional)" hint="Leave blank to use the trainer's per-session rate × sessions">
        <Input inputMode="decimal" value={priceRupees} onChange={(e) => setPriceRupees(e.target.value.replace(/[^\d.]/g, ""))} placeholder="₹" />
      </Field>
      <Field label="Valid for (days, optional)">
        <Input inputMode="numeric" value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value.replace(/\D/g, ""))} />
      </Field>
      {error && <p className="text-sm font-semibold text-warn">{error}</p>}
      <Button variant="primary" disabled={busy} onClick={submit}>
        {busy ? "Saving…" : "Create package"}
      </Button>
    </Modal>
  );
}

function bmi(weightKg?: number, heightCm?: number): string | undefined {
  if (!weightKg || !heightCm) return undefined;
  const m = heightCm / 100;
  return (weightKg / (m * m)).toFixed(1);
}

function measurementsSummary(m?: FitnessMeasurements): string {
  if (!m) return "—";
  const parts: string[] = [];
  if (m.chestCm) parts.push(`Chest ${m.chestCm}`);
  if (m.waistCm) parts.push(`Waist ${m.waistCm}`);
  if (m.hipsCm) parts.push(`Hips ${m.hipsCm}`);
  if (m.armsCm) parts.push(`Arms ${m.armsCm}`);
  if (m.thighsCm) parts.push(`Thighs ${m.thighsCm}`);
  return parts.length ? parts.join(" · ") : "—";
}

function FitnessPanel({
  memberId,
  logs,
  onChanged,
  canLog,
}: {
  memberId: string;
  logs: FitnessLog[];
  onChanged: (logs: FitnessLog[]) => void;
  canLog: boolean;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestHeightCm = logs.find((l) => l.heightCm)?.heightCm;
  const latest = logs[0];
  const previous = logs[1];
  const weightDelta =
    latest?.weightKg !== undefined && previous?.weightKg !== undefined ? latest.weightKg - previous.weightKg : null;

  async function remove(logId: string) {
    if (!confirm("Delete this entry?")) return;
    try {
      await membersApi.deleteFitness(memberId, logId);
      onChanged(logs.filter((l) => l._id !== logId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete this entry.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {canLog && (
        <div>
          <Button variant="primary" onClick={() => setFormOpen(true)}>
            + Log entry
          </Button>
        </div>
      )}
      {error && <p className="text-sm font-semibold text-warn">{error}</p>}

      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi
            label="Weight"
            value={latest.weightKg ? `${latest.weightKg} kg` : "—"}
            sub={weightDelta !== null ? `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} kg since last` : undefined}
          />
          <Kpi label="BMI" value={bmi(latest.weightKg, latest.heightCm ?? latestHeightCm) ?? "—"} />
          <Kpi label="Body fat" value={latest.bodyFatPercent ? `${latest.bodyFatPercent}%` : "—"} />
          <Kpi label="Logged" value={formatDate(latest.date)} />
        </div>
      )}

      {logs.length === 0 && <p className="text-sm text-muted">No progress logged yet.</p>}

      {logs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2">Date</th>
                <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2">Weight</th>
                <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2">Body fat</th>
                <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2">Measurements</th>
                <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2">Notes</th>
                {canLog && <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2" />}
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l._id} className="border-t border-line2">
                  <td className="p-2.5">{formatDate(l.date)}</td>
                  <td className="p-2.5">{l.weightKg ? `${l.weightKg} kg` : "—"}</td>
                  <td className="p-2.5">{l.bodyFatPercent ? `${l.bodyFatPercent}%` : "—"}</td>
                  <td className="p-2.5 text-sm text-muted">{measurementsSummary(l.measurements)}</td>
                  <td className="p-2.5 text-sm text-muted">{l.notes ?? "—"}</td>
                  {canLog && (
                    <td className="p-2.5">
                      <button type="button" className="text-sm text-warn font-semibold" onClick={() => void remove(l._id)}>
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LogFitnessModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        memberId={memberId}
        onCreated={(log) => {
          onChanged([log, ...logs]);
          setFormOpen(false);
        }}
      />
    </div>
  );
}

function LogFitnessModal({
  open,
  onClose,
  memberId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  memberId: string;
  onCreated: (log: FitnessLog) => void;
}) {
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [bodyFatPercent, setBodyFatPercent] = useState("");
  const [chestCm, setChestCm] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [hipsCm, setHipsCm] = useState("");
  const [armsCm, setArmsCm] = useState("");
  const [thighsCm, setThighsCm] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function num(v: string): number | undefined {
    if (!v.trim()) return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await membersApi.addFitness(memberId, {
        weightKg: num(weightKg),
        heightCm: num(heightCm),
        bodyFatPercent: num(bodyFatPercent),
        measurements: {
          chestCm: num(chestCm),
          waistCm: num(waistCm),
          hipsCm: num(hipsCm),
          armsCm: num(armsCm),
          thighsCm: num(thighsCm),
        },
        notes: notes || undefined,
      });
      onCreated(res.log);
      setWeightKg("");
      setHeightCm("");
      setBodyFatPercent("");
      setChestCm("");
      setWaistCm("");
      setHipsCm("");
      setArmsCm("");
      setThighsCm("");
      setNotes("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this entry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log progress">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Weight (kg)">
          <Input inputMode="decimal" value={weightKg} onChange={(e) => setWeightKg(sanitizeDecimalInput(e.target.value))} />
        </Field>
        <Field label="Height (cm)">
          <Input inputMode="decimal" value={heightCm} onChange={(e) => setHeightCm(sanitizeDecimalInput(e.target.value))} />
        </Field>
        <Field label="Body fat %">
          <Input inputMode="decimal" value={bodyFatPercent} onChange={(e) => setBodyFatPercent(sanitizeDecimalInput(e.target.value))} />
        </Field>
      </div>
      <p className="text-sm font-semibold text-muted mt-1">Measurements (cm, optional)</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Chest">
          <Input inputMode="decimal" value={chestCm} onChange={(e) => setChestCm(sanitizeDecimalInput(e.target.value))} />
        </Field>
        <Field label="Waist">
          <Input inputMode="decimal" value={waistCm} onChange={(e) => setWaistCm(sanitizeDecimalInput(e.target.value))} />
        </Field>
        <Field label="Hips">
          <Input inputMode="decimal" value={hipsCm} onChange={(e) => setHipsCm(sanitizeDecimalInput(e.target.value))} />
        </Field>
        <Field label="Arms">
          <Input inputMode="decimal" value={armsCm} onChange={(e) => setArmsCm(sanitizeDecimalInput(e.target.value))} />
        </Field>
        <Field label="Thighs">
          <Input inputMode="decimal" value={thighsCm} onChange={(e) => setThighsCm(sanitizeDecimalInput(e.target.value))} />
        </Field>
      </div>
      <Field label="Notes (optional)">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      {error && <p className="text-sm font-semibold text-warn">{error}</p>}
      <Button variant="primary" disabled={busy} onClick={submit}>
        {busy ? "Saving…" : "Save entry"}
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
