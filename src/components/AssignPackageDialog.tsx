"use client";

import { useEffect, useState } from "react";
import { adminApi, ApiError } from "@/lib/api";
import { formatPaise } from "@/lib/format";
import { Button, Field, Modal, Pill, Select } from "@/components/ui";
import type { Package } from "@/types/api";

export function AssignPackageDialog({
  open,
  onClose,
  gymId,
  onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  gymId: string;
  onAssigned: () => void;
}) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [packageId, setPackageId] = useState("");
  const [payer, setPayer] = useState<"franchisor" | "each_franchisee">("franchisor");
  const [discountPct, setDiscountPct] = useState("0");
  const [start, setStart] = useState<"next_billing" | "immediate">("immediate");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    adminApi.listPackages().then((res) => {
      setPackages(res.packages);
      setPackageId((prev) => prev || res.packages[0]?._id || "");
    });
  }, [open]);

  const selected = packages.find((p) => p._id === packageId);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await adminApi.assignPackage(gymId, { packageId, payer, discountPct: Number(discountPct), start });
      onAssigned();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't assign that package.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Change package">
      <Field label="Package">
        <Select value={packageId} onChange={(e) => setPackageId(e.target.value)}>
          {packages.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name} — {formatPaise(p.monthlyPricePaise)}/{p.chargeUnit === "branch" ? "branch" : p.chargeUnit}/mo
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Who pays">
        <div className="flex gap-2">
          <Pill active={payer === "franchisor"} onClick={() => setPayer("franchisor")}>
            Franchisor pays
          </Pill>
          <Pill active={payer === "each_franchisee"} onClick={() => setPayer("each_franchisee")}>
            Each franchisee pays
          </Pill>
        </div>
      </Field>

      <Field label="Discount %">
        <input
          type="number"
          min={0}
          max={100}
          value={discountPct}
          onChange={(e) => setDiscountPct(e.target.value)}
          className="min-h-[44px] px-3 rounded-[10px] border border-line bg-surface w-full"
        />
      </Field>

      <Field label="Start">
        <div className="flex gap-2">
          <Pill active={start === "immediate"} onClick={() => setStart("immediate")}>
            Immediately, prorated
          </Pill>
          <Pill active={start === "next_billing"} onClick={() => setStart("next_billing")}>
            Next billing date
          </Pill>
        </div>
      </Field>

      {selected && (
        <p className="text-sm text-muted bg-line2 rounded-lg px-3 py-2">
          New monthly total depends on this gym&apos;s branch count × {formatPaise(selected.monthlyPricePaise)} × (1 − {discountPct || 0}%), plus GST.
        </p>
      )}

      {error && <p className="text-sm font-semibold text-warn">{error}</p>}

      <Button variant="primary" disabled={!packageId || busy} onClick={submit}>
        {busy ? "Assigning…" : "Assign package"}
      </Button>
    </Modal>
  );
}
