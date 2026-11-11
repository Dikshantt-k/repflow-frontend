"use client";

import { useEffect, useState } from "react";
import { branchesApi, expensesApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import { formatDate, formatPaise, rupeesToPaise } from "@/lib/format";
import { Button, Card, EmptyState, Field, Input, Kpi, Modal, Pill, Select, Spinner } from "@/components/ui";
import type { Branch, Expense, ExpenseCategory } from "@/types/api";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: "Rent",
  electricity: "Electricity",
  maintenance: "Maintenance",
  staff_salary: "Staff salary",
  equipment: "Equipment",
  marketing: "Marketing",
  vendor: "Vendor",
  other: "Other",
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ExpenseCategory[];
const PAGE_SIZE = 25;

export default function ExpensesPage() {
  const { context } = useAuth();
  const canManage = can.manageExpenses(context?.role);

  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [totalPaise, setTotalPaise] = useState(0);
  const [total, setTotal] = useState(0);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [category, setCategory] = useState<ExpenseCategory | "all">("all");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    expensesApi
      .list({ category: category === "all" ? undefined : category, page, pageSize: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        // A delete or filter change can shrink the result set out from under the current
        // page — clamp back instead of showing an empty table above a "page 2 of 1" label.
        const pages = Math.max(1, Math.ceil(res.pagination.total / PAGE_SIZE));
        if (page > pages) {
          setPage(pages);
          return;
        }
        setExpenses(res.expenses);
        setTotalPaise(res.totalPaise);
        setTotal(res.pagination.total);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Couldn't load expenses.");
      });
    return () => {
      cancelled = true;
    };
  }, [category, page, reloadKey]);

  useEffect(() => {
    branchesApi.list().then((res) => setBranches(res.branches));
  }, []);

  async function remove(id: string) {
    if (!confirm("Delete this expense?")) return;
    try {
      await expensesApi.remove(id);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete this expense.");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <h1>Expenses</h1>
        {canManage && (
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            + Add expense
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Kpi label="Total (this filter)" value={formatPaise(totalPaise)} sub={`${total} expense${total === 1 ? "" : "s"}`} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Pill active={category === "all"} onClick={() => { setCategory("all"); setPage(1); }}>
          All
        </Pill>
        {CATEGORIES.map((c) => (
          <Pill key={c} active={category === c} onClick={() => { setCategory(c); setPage(1); }}>
            {CATEGORY_LABELS[c]}
          </Pill>
        ))}
      </div>

      {error && <p className="text-sm font-semibold text-warn">{error}</p>}

      <Card className="p-0 overflow-x-auto">
        {!expenses ? (
          <div className="p-5">
            <Spinner />
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState>No expenses recorded yet.</EmptyState>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Date</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Category</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Description</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Vendor</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Amount</th>
                {canManage && <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2" />}
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e._id} className="border-t border-line2">
                  <td className="p-3">{formatDate(e.date)}</td>
                  <td className="p-3">{CATEGORY_LABELS[e.category]}</td>
                  <td className="p-3">{e.description}</td>
                  <td className="p-3 text-muted">{e.vendor ?? "—"}</td>
                  <td className="p-3 font-semibold">{formatPaise(e.amountPaise)}</td>
                  {canManage && (
                    <td className="p-3 text-right">
                      <button type="button" className="text-sm text-warn font-semibold" onClick={() => void remove(e._id)}>
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {total > 0 && (
          <div className="flex items-center justify-between gap-4 p-3 border-t border-line2">
            <span className="text-sm text-muted">
              Page {page} of {totalPages} · {total} total
            </span>
            <div className="flex gap-2">
              <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <CreateExpenseModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        branches={branches}
        onCreated={() => {
          setCreateOpen(false);
          setReloadKey((k) => k + 1);
        }}
      />
    </div>
  );
}

function CreateExpenseModal({
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
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [description, setDescription] = useState("");
  const [vendor, setVendor] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill from the fetched branch list when the modal opens
    if (open) setBranchId((prev) => prev || branches[0]?._id || "");
  }, [open, branches]);

  async function submit() {
    setError(null);
    const amount = Number(amountRupees);
    if (!branchId) {
      setError("Choose a branch.");
      return;
    }
    if (!description.trim()) {
      setError("Enter what this expense was for.");
      return;
    }
    if (!amountRupees.trim() || !(amount > 0)) {
      setError("Enter an amount above ₹0.");
      return;
    }
    setBusy(true);
    try {
      await expensesApi.create({
        branchId,
        category,
        description: description.trim(),
        vendor: vendor.trim() || undefined,
        amountPaise: rupeesToPaise(amount),
        date: new Date(date).toISOString(),
      });
      setDescription("");
      setVendor("");
      setAmountRupees("");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this expense.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add expense">
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
      <Field label="Category">
        <Select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Description">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. October rent" />
      </Field>
      <Field label="Vendor (optional)">
        <Input value={vendor} onChange={(e) => setVendor(e.target.value)} />
      </Field>
      <Field label="Amount">
        <Input inputMode="decimal" value={amountRupees} onChange={(e) => setAmountRupees(e.target.value.replace(/[^\d.]/g, ""))} placeholder="₹" />
      </Field>
      <Field label="Date">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      {error && <p className="text-sm font-semibold text-warn">{error}</p>}
      <Button variant="primary" disabled={busy} onClick={submit}>
        {busy ? "Saving…" : "Save expense"}
      </Button>
    </Modal>
  );
}
