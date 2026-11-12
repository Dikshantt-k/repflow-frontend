"use client";

import { useEffect, useMemo, useState } from "react";
import { branchesApi, plansApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import { Badge, Button, Card, EmptyState, Field, Input, Pill, Spinner } from "@/components/ui";
import { formatPaise } from "@/lib/format";
import { orgLocale, plusTaxSuffix } from "@/lib/locale";
import { PlanDialog } from "@/components/PlanDialog";
import type { Branch, Plan, PlanStatus } from "@/types/api";

type StatusFilter = "all" | PlanStatus;

function lengthLabel(plan: Plan): string {
  const unit = plan.lengthUnit === "month" ? "month" : plan.lengthUnit === "day" ? "day" : "session";
  const n = plan.lengthValue;
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

export default function PlansPage() {
  const { context } = useAuth();
  const canManage = can.managePlans(context?.role);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | undefined>(undefined);

  async function load() {
    setLoading(true);
    const [plansRes, branchesRes] = await Promise.all([plansApi.list(), branchesApi.list()]);
    setPlans(plansRes.plans);
    setBranches(branchesRes.branches);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const branchNameById = useMemo(() => new Map(branches.map((b) => [b._id, b.name])), [branches]);

  const filtered = plans.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search.trim() && !p.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(plan: Plan) {
    setEditing(plan);
    setDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1>Membership plans</h1>
          <p className="text-muted mt-1">
            {orgLocale().tax.ratePct > 0 ? `Prices include ${orgLocale().tax.ratePct}% ${orgLocale().tax.name}.` : "Prices don't include tax."}
          </p>
        </div>
        {canManage && (
          <Button variant="primary" onClick={openCreate}>
            + New plan
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <Field label="Search">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search plans" className="max-w-[260px]" />
        </Field>
        <div className="flex gap-2">
          <Pill active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
            All
          </Pill>
          <Pill active={statusFilter === "shown"} onClick={() => setStatusFilter("shown")}>
            Shown
          </Pill>
          <Pill active={statusFilter === "hidden"} onClick={() => setStatusFilter("hidden")}>
            Hidden
          </Pill>
        </div>
      </div>

      <Card className="p-0 overflow-x-auto">
        {loading ? (
          <div className="p-5">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState>No plans match.</EmptyState>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2 rounded-l-lg">Plan</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Length</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Price</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Joining fee</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Branches</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Status</th>
                {canManage && <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2 rounded-r-lg" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((plan) => (
                <tr key={plan._id} className="border-t border-line2">
                  <td className="p-3 font-semibold">{plan.name}</td>
                  <td className="p-3">{lengthLabel(plan)}</td>
                  <td className="p-3">
                    {formatPaise(plan.pricePaise)}
                    {plusTaxSuffix() && <span className="block text-xs text-muted">{plusTaxSuffix().trim()}</span>}
                  </td>
                  <td className="p-3">{plan.joiningFeePaise > 0 ? formatPaise(plan.joiningFeePaise) : "None"}</td>
                  <td className="p-3">
                    {plan.allBranches ? "All branches" : plan.branchIds.map((id) => branchNameById.get(id) ?? id).join(", ") || "—"}
                  </td>
                  <td className="p-3">
                    <Badge tone={plan.status === "shown" ? "green" : "gray"}>{plan.status === "shown" ? "Shown" : "Hidden"}</Badge>
                  </td>
                  {canManage && (
                    <td className="p-3 text-right">
                      <Button onClick={() => openEdit(plan)}>Edit</Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <PlanDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={() => void load()} branches={branches} initial={editing} />
    </div>
  );
}
