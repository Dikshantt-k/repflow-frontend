"use client";

import { useEffect, useState } from "react";
import { ApiError, plansApi, type PlanInput } from "@/lib/api";
import { Modal, Button, Field, Input, Select, EmptyState } from "@/components/ui";
import { formatPaise, rupeesToPaise } from "@/lib/format";
import type { Branch, Plan, PlanLengthUnit, PlanStatus } from "@/types/api";

interface PlanDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  branches: Branch[];
  initial?: Plan;
}

function gstPreview(pricePaise: number): { taxable: number; cgst: number; sgst: number } | null {
  if (!pricePaise || pricePaise <= 0) return null;
  const taxable = Math.round(pricePaise / 1.18);
  const gst = pricePaise - taxable;
  const cgst = Math.round(gst / 2);
  const sgst = Math.round(gst / 2);
  return { taxable, cgst, sgst };
}

export function PlanDialog({ open, onClose, onSaved, branches, initial }: PlanDialogProps) {
  const isEdit = Boolean(initial);

  const [name, setName] = useState("");
  const [lengthValue, setLengthValue] = useState("1");
  const [lengthUnit, setLengthUnit] = useState<PlanLengthUnit>("month");
  const [validityDays, setValidityDays] = useState("90");
  const [priceRupees, setPriceRupees] = useState("");
  const [joiningFeeRupees, setJoiningFeeRupees] = useState("0");
  const [allBranches, setAllBranches] = useState(true);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [onlineRenewal, setOnlineRenewal] = useState(true);
  const [status, setStatus] = useState<PlanStatus>("shown");

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setLengthValue(String(initial.lengthValue));
      setLengthUnit(initial.lengthUnit);
      setValidityDays(String(initial.validityDaysForSessions ?? 90));
      setPriceRupees(String(initial.pricePaise / 100));
      setJoiningFeeRupees(String(initial.joiningFeePaise / 100));
      setAllBranches(initial.allBranches);
      setBranchIds(initial.branchIds);
      setOnlineRenewal(initial.onlineRenewal);
      setStatus(initial.status);
    } else {
      setName("");
      setLengthValue("1");
      setLengthUnit("month");
      setValidityDays("90");
      setPriceRupees("");
      setJoiningFeeRupees("0");
      setAllBranches(true);
      setBranchIds([]);
      setOnlineRenewal(true);
      setStatus("shown");
    }
    setError(null);
  }, [open, initial]);

  const pricePaisePreview = priceRupees.trim() ? rupeesToPaise(Number(priceRupees)) : 0;
  const preview = gstPreview(pricePaisePreview);

  function toggleBranch(id: string) {
    setBranchIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Give the plan a name.");
      return;
    }
    const price = Number(priceRupees);
    if (!priceRupees.trim() || !(price > 0)) {
      setError("Enter a price above ₹0.");
      return;
    }

    setBusy(true);
    try {
      const input: PlanInput = {
        name: name.trim(),
        lengthValue: Number(lengthValue) || 1,
        lengthUnit,
        validityDaysForSessions: lengthUnit === "session" ? Number(validityDays) || 90 : undefined,
        pricePaise: rupeesToPaise(price),
        joiningFeePaise: joiningFeeRupees.trim() ? rupeesToPaise(Number(joiningFeeRupees)) : 0,
        allBranches,
        branchIds: allBranches ? [] : branchIds,
        onlineRenewal,
        status,
      };

      if (isEdit && initial) {
        await plansApi.update(initial._id, input);
      } else {
        await plansApi.create(input);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this plan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit plan" : "New plan"}>
      <div className="flex flex-col gap-3.5">
        <Field label="Plan name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Quarterly" />
        </Field>

        <div className="flex gap-3 flex-wrap">
          <Field label="Length">
            <Input type="number" min={1} value={lengthValue} onChange={(e) => setLengthValue(e.target.value)} className="w-24" />
          </Field>
          <Field label="Unit">
            <Select value={lengthUnit} onChange={(e) => setLengthUnit(e.target.value as PlanLengthUnit)}>
              <option value="month">Month(s)</option>
              <option value="day">Day(s)</option>
              <option value="session">Session(s)</option>
            </Select>
          </Field>
          {lengthUnit === "session" && (
            <Field label="Validity (days)">
              <Input type="number" min={1} value={validityDays} onChange={(e) => setValidityDays(e.target.value)} className="w-28" />
            </Field>
          )}
        </div>

        <Field
          label="Price (incl. GST)"
          hint={preview ? `Taxable ${formatPaise(preview.taxable)} + GST ${formatPaise(preview.cgst + preview.sgst)}` : undefined}
        >
          <Input inputMode="decimal" value={priceRupees} onChange={(e) => setPriceRupees(e.target.value.replace(/[^\d.]/g, ""))} placeholder="₹" />
        </Field>

        <Field label="Joining fee">
          <Input
            inputMode="decimal"
            value={joiningFeeRupees}
            onChange={(e) => setJoiningFeeRupees(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="₹0"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={allBranches} onChange={(e) => setAllBranches(e.target.checked)} className="w-[18px] h-[18px] accent-accent" />
          Sell at all branches
        </label>

        {!allBranches && (
          <div className="flex flex-col gap-1.5 pl-1">
            {branches.length === 0 && <EmptyState>No branches yet.</EmptyState>}
            {branches.map((b) => (
              <label key={b._id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={branchIds.includes(b._id)}
                  onChange={() => toggleBranch(b._id)}
                  className="w-[18px] h-[18px] accent-accent"
                />
                {b.name}
              </label>
            ))}
          </div>
        )}

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={onlineRenewal}
            onChange={(e) => setOnlineRenewal(e.target.checked)}
            className="w-[18px] h-[18px] accent-accent"
          />
          Members can renew online
        </label>

        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as PlanStatus)}>
            <option value="shown">Shown</option>
            <option value="hidden">Hidden</option>
          </Select>
        </Field>

        {error && <p className="text-sm font-semibold text-warn">{error}</p>}

        <div className="flex gap-2 border-t border-line2 pt-3">
          <Button className="flex-1" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" className="flex-1" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : isEdit ? "Save changes" : "Create plan"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
