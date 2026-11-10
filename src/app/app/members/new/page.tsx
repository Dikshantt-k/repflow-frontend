"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, branchesApi, membersApi, plansApi } from "@/lib/api";
import { formatPaise, rupeesToPaise } from "@/lib/format";
import { Avatar, Button, Card, Field, Input, Pill, Select } from "@/components/ui";
import type { Branch, Plan } from "@/types/api";

const GENDERS: Array<{ value: string; label: string }> = [
  { value: "prefer_not_to_say", label: "Prefer not to say" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

const PHONE_REGEX = /^[6-9]\d{9}$/;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function planLabel(plan: Plan): string {
  const length = plan.lengthUnit === "session" ? `${plan.lengthValue} sessions` : `${plan.lengthValue} ${plan.lengthUnit}${plan.lengthValue === 1 ? "" : "s"}`;
  return `${plan.name} — ${length} — ${formatPaise(plan.pricePaise)}`;
}

export default function AddMemberPage() {
  const router = useRouter();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Personal details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("prefer_not_to_say");
  const [dob, setDob] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [healthNotes, setHealthNotes] = useState("");
  const [email, setEmail] = useState("");

  // Membership
  const [branchId, setBranchId] = useState("");
  const [planId, setPlanId] = useState("");
  const [startDate, setStartDate] = useState(todayIso());

  // Payment
  const [joiningFeeWaived, setJoiningFeeWaived] = useState(false);
  const [discountRupees, setDiscountRupees] = useState("");
  const [mode, setMode] = useState<"upi" | "cash" | "card">("upi");
  const [amountPaidRupees, setAmountPaidRupees] = useState("");
  const [gstInvoice, setGstInvoice] = useState(true);
  const [sendWelcomeMessage, setSendWelcomeMessage] = useState(true);
  const amountTouched = useRef(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateMemberId, setDuplicateMemberId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([branchesApi.list(), plansApi.list()])
      .then(([b, p]) => {
        setBranches(b.branches);
        setPlans(p.plans);
        if (b.branches.length === 1) setBranchId(b.branches[0]!._id);
      })
      .finally(() => setLoadingOptions(false));
  }, []);

  const eligiblePlans = useMemo(
    () => plans.filter((p) => p.status === "shown" && (p.allBranches || p.branchIds.includes(branchId))),
    [plans, branchId]
  );

  const selectedPlan = eligiblePlans.find((p) => p._id === planId) ?? null;

  const discountPaise = rupeesToPaise(Number(discountRupees) || 0);
  const joiningFeePaise = selectedPlan && !joiningFeeWaived ? selectedPlan.joiningFeePaise : 0;
  const totalPaise = selectedPlan ? Math.max(selectedPlan.pricePaise + joiningFeePaise - discountPaise, 0) : 0;
  const amountPaidPaise = rupeesToPaise(Number(amountPaidRupees) || 0);
  const balancePaise = Math.max(totalPaise - amountPaidPaise, 0);

  useEffect(() => {
    // Prefill the amount-paid field from the computed total until the staff member edits it by hand.
    if (!amountTouched.current) {
      setAmountPaidRupees(totalPaise > 0 ? String(totalPaise / 100) : "");
    }
  }, [totalPaise]);

  const phoneValid = PHONE_REGEX.test(phone);

  async function submit() {
    setFormError(null);
    setDuplicateMemberId(null);

    if (!firstName.trim()) {
      setFormError("Enter the member's first name.");
      return;
    }
    if (!phoneValid) {
      setFormError("Enter a 10-digit mobile number, for example 98200 11234.");
      return;
    }
    if (!branchId) {
      setFormError("Choose a branch.");
      return;
    }
    if (!selectedPlan) {
      setFormError("Choose a membership plan.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await membersApi.create({
        branchId,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        phone,
        gender,
        dob: dob || undefined,
        emergencyContact: emergencyName || emergencyPhone ? { name: emergencyName || undefined, phone: emergencyPhone || undefined } : undefined,
        healthNotes: healthNotes.trim() || undefined,
        email: email.trim() || undefined,
        planId: selectedPlan._id,
        startDate,
        joiningFeeWaived,
        discountPaise,
        mode,
        amountPaidPaise,
        gstInvoice,
        sendWelcomeMessage,
      });

      router.push(`/app/members/${res.member._id}?toast=${encodeURIComponent(`Member added. Receipt ${res.receiptNo}.`)}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        const details = err.details as { existingMemberId?: string } | undefined;
        if (err.status === 409 && details?.existingMemberId) setDuplicateMemberId(details.existingMemberId);
      } else {
        setFormError("Couldn't save this member. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-muted">
          <Link href="/app/members" className="font-semibold">
            Members
          </Link>{" "}
          / Add member
        </p>
        <h1 className="text-3xl mt-1">Add member</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <Card>
          <h2 className="text-xl">Personal details</h2>
          <div className="flex items-center gap-4">
            <Avatar size="xl" label={`${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "?"} />
            <p className="text-sm text-muted">Photo upload isn&apos;t wired up yet — an initials avatar is used instead.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name *">
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </Field>
            <Field label="Last name">
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field>
          </div>
          <Field label="Mobile *" hint="We use it for login and WhatsApp updates" error={phone && !phoneValid ? "Enter a 10-digit mobile number, for example 98200 11234." : undefined}>
            <Input
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="98200 11234"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gender">
              <Select value={gender} onChange={(e) => setGender(e.target.value)}>
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date of birth">
              <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Emergency contact name">
              <Input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
            </Field>
            <Field label="Emergency contact number">
              <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
            </Field>
          </div>
          <Field label="Health notes">
            <Input value={healthNotes} onChange={(e) => setHealthNotes(e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Email" hint="Optional — lets the member set up the member app at /member/claim">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" />
          </Field>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <h2 className="text-xl">Membership</h2>
            <Field label="Branch">
              <Select
                value={branchId}
                onChange={(e) => {
                  setBranchId(e.target.value);
                  setPlanId("");
                }}
                disabled={loadingOptions}
              >
                <option value="">Choose a branch</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Plan" hint={branchId && eligiblePlans.length === 0 ? "No plans are sold at this branch yet." : undefined}>
              <Select value={planId} onChange={(e) => setPlanId(e.target.value)} disabled={!branchId}>
                <option value="">Choose a plan</option>
                {eligiblePlans.map((p) => (
                  <option key={p._id} value={p._id}>
                    {planLabel(p)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Start date">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
          </Card>

          {selectedPlan && (
            <Card>
              <h2 className="text-xl">Payment</h2>
              <div className="flex flex-col">
                <Row label="Plan price" value={formatPaise(selectedPlan.pricePaise)} />
                {selectedPlan.joiningFeePaise > 0 && (
                  <div className="flex justify-between items-center gap-3 py-2.5 border-t border-line2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={joiningFeeWaived} onChange={(e) => setJoiningFeeWaived(e.target.checked)} className="w-[18px] h-[18px] accent-accent" />
                      Waive joining fee ({formatPaise(selectedPlan.joiningFeePaise)})
                    </label>
                    <span className={joiningFeeWaived ? "line-through text-muted" : ""}>{formatPaise(selectedPlan.joiningFeePaise)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center gap-3 py-2.5 border-t border-line2">
                  <span className="text-muted">Discount</span>
                  <Input
                    inputMode="decimal"
                    value={discountRupees}
                    onChange={(e) => setDiscountRupees(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="₹0"
                    className="w-28 text-right"
                  />
                </div>
                <div className="flex justify-between items-center gap-3 py-2.5 border-t border-line2">
                  <span className="font-semibold">Total</span>
                  <b className="font-display text-2xl">{formatPaise(totalPaise)}</b>
                </div>
              </div>

              <Field label="Payment mode">
                <div className="flex gap-2">
                  {(["upi", "cash", "card"] as const).map((m) => (
                    <Pill key={m} active={mode === m} onClick={() => setMode(m)}>
                      {m.toUpperCase()}
                    </Pill>
                  ))}
                </div>
              </Field>

              <div className="flex justify-between items-center gap-3">
                <span className="text-muted">Amount paid now</span>
                <Input
                  inputMode="decimal"
                  value={amountPaidRupees}
                  onChange={(e) => {
                    amountTouched.current = true;
                    setAmountPaidRupees(e.target.value.replace(/[^\d.]/g, ""));
                  }}
                  className="w-32 text-right"
                />
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-muted">Balance</span>
                <span className={balancePaise > 0 ? "font-semibold text-warn" : "font-semibold"}>{formatPaise(balancePaise)}</span>
              </div>

              <label className="flex items-center gap-2 pt-2 border-t border-line2">
                <input type="checkbox" checked={gstInvoice} onChange={(e) => setGstInvoice(e.target.checked)} className="w-[18px] h-[18px] accent-accent" />
                GST invoice
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sendWelcomeMessage}
                  onChange={(e) => setSendWelcomeMessage(e.target.checked)}
                  className="w-[18px] h-[18px] accent-accent"
                />
                Send welcome message and receipt on WhatsApp
              </label>
            </Card>
          )}

          {formError && (
            <p className="text-sm font-semibold text-warn bg-warn-soft rounded-lg px-3 py-2">
              {formError}
              {duplicateMemberId && (
                <>
                  {" "}
                  <Link href={`/app/members/${duplicateMemberId}`} className="underline">
                    Open profile
                  </Link>
                </>
              )}
            </p>
          )}

          <div className="flex gap-3">
            <Link href="/app/members" className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-[10px] border border-line font-semibold text-sm">
              Cancel
            </Link>
            <Button variant="primary" disabled={submitting} onClick={submit} className="flex-1">
              {submitting ? "Saving…" : "Save member and show receipt"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center gap-3 py-2.5">
      <span className="text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
