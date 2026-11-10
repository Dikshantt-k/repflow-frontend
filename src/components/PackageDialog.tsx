"use client";

import { useState } from "react";
import { adminApi, ApiError, type PackageInput } from "@/lib/api";
import { rupeesToPaise } from "@/lib/format";
import { Button, Field, Input, Select } from "@/components/ui";
import type { ChargeUnit, Package } from "@/types/api";

const MODULES = [
  "members",
  "payments",
  "gst_receipts",
  "manual_attendance",
  "biometric_attendance",
  "auto_reminders",
  "multi_branch_dashboard",
  "staff_roles",
  "franchise_network",
  "leads",
  "personal_training",
  "advanced_reports",
];

export function PackageDialog({ initial, onClose, onSaved }: { initial?: Package; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? true);
  const [monthly, setMonthly] = useState(initial ? String(initial.monthlyPricePaise / 100) : "");
  const [chargeUnit, setChargeUnit] = useState<ChargeUnit>(initial?.chargeUnit ?? "branch");
  const [trialDays, setTrialDays] = useState(String(initial?.trialDays ?? 14));
  const [minBranches, setMinBranches] = useState(String(initial?.minBranches ?? 1));
  const [maxBranches, setMaxBranches] = useState(initial?.limits.maxBranches ? String(initial.limits.maxBranches) : "");
  const [membersPerBranch, setMembersPerBranch] = useState(initial?.limits.membersPerBranch ? String(initial.limits.membersPerBranch) : "");
  const [whatsapp, setWhatsapp] = useState(initial?.limits.whatsappMessagesPerMonth != null ? String(initial.limits.whatsappMessagesPerMonth) : "");
  const [staffLogins, setStaffLogins] = useState(initial?.limits.staffLogins ? String(initial.limits.staffLogins) : "");
  const [modules, setModules] = useState<string[]>(initial?.modules ?? []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleModule(m: string) {
    setModules((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  async function submit() {
    setError(null);
    if (!name.trim()) return setError("Give the package a name.");
    if (!monthly || Number(monthly) < 0) return setError("Enter a monthly price.");

    setBusy(true);
    try {
      const body: PackageInput = {
        name,
        description: description || undefined,
        isPublic,
        monthlyPricePaise: rupeesToPaise(Number(monthly)),
        chargeUnit,
        trialDays: Number(trialDays),
        minBranches: Number(minBranches),
        limits: {
          maxBranches: maxBranches ? Number(maxBranches) : null,
          membersPerBranch: membersPerBranch ? Number(membersPerBranch) : null,
          whatsappMessagesPerMonth: whatsapp ? Number(whatsapp) : null,
          staffLogins: staffLogins ? Number(staffLogins) : null,
        },
        modules,
      };
      if (initial) await adminApi.updatePackage(initial._id, body);
      else await adminApi.createPackage(body);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this package.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4" style={{ background: "rgba(10,14,13,.55)" }} onClick={onClose}>
      <div className="bg-surface text-ink rounded-2xl w-full max-w-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl">{initial ? "Edit package" : "New package"}</h2>
          <button type="button" onClick={onClose} className="text-muted text-2xl leading-none">
            &times;
          </button>
        </div>

        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Short description">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div className="flex gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={isPublic} onChange={() => setIsPublic(true)} /> Public
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={!isPublic} onChange={() => setIsPublic(false)} /> Private
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Monthly price (₹)">
            <Input inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value.replace(/[^\d.]/g, ""))} />
          </Field>
          <Field label="Charged per">
            <Select value={chargeUnit} onChange={(e) => setChargeUnit(e.target.value as ChargeUnit)}>
              <option value="branch">Per branch</option>
              <option value="flat">Flat per account</option>
              <option value="member">Per active member</option>
            </Select>
          </Field>
          <Field label="Free trial days">
            <Input inputMode="numeric" value={trialDays} onChange={(e) => setTrialDays(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="Minimum branches">
            <Input inputMode="numeric" value={minBranches} onChange={(e) => setMinBranches(e.target.value.replace(/\D/g, ""))} />
          </Field>
        </div>

        <p className="text-sm font-semibold text-muted">Limits (blank = unlimited)</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Max branches">
            <Input inputMode="numeric" value={maxBranches} onChange={(e) => setMaxBranches(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="Members per branch">
            <Input inputMode="numeric" value={membersPerBranch} onChange={(e) => setMembersPerBranch(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="WhatsApp messages / month">
            <Input inputMode="numeric" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="Staff logins">
            <Input inputMode="numeric" value={staffLogins} onChange={(e) => setStaffLogins(e.target.value.replace(/\D/g, ""))} />
          </Field>
        </div>

        <p className="text-sm font-semibold text-muted">Modules included</p>
        <div className="grid grid-cols-2 gap-1.5">
          {MODULES.map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={modules.includes(m)} onChange={() => toggleModule(m)} />
              {m.replace(/_/g, " ")}
            </label>
          ))}
        </div>

        {initial && initial.usedByGyms > 0 && (
          <p className="text-sm bg-warn-soft text-warn-ink rounded-lg px-3 py-2">
            Changes apply to {initial.usedByGyms} gym{initial.usedByGyms === 1 ? "" : "s"} from their next billing date.
          </p>
        )}
        {error && <p className="text-sm font-semibold text-warn">{error}</p>}

        <Button variant="primary" disabled={busy} onClick={submit}>
          {busy ? "Saving…" : "Save package"}
        </Button>
      </div>
    </div>
  );
}
