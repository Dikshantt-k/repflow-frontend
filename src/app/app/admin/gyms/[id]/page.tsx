"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { adminApi } from "@/lib/api";
import { formatPaise, formatDate } from "@/lib/format";
import { Badge, Button, Card, Spinner } from "@/components/ui";
import { AssignPackageDialog } from "@/components/AssignPackageDialog";
import type { AdminGymDetail, PlatformInvoice } from "@/types/api";

export default function AdminGymDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AdminGymDetail | null>(null);
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  const load = useCallback(() => {
    adminApi.getGym(id).then(setData);
    adminApi.listInvoices(id).then((res) => setInvoices(res.invoices));
  }, [id]);

  useEffect(() => load(), [load]);

  async function markPaid(invoiceId: string) {
    setMarkingPaidId(invoiceId);
    try {
      await adminApi.markInvoicePaid(invoiceId);
      load();
    } finally {
      setMarkingPaidId(null);
    }
  }

  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const { org, owner, memberCount, mrrPaise, subscription, package: pkg, network } = data;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl">{org.name}</h1>
          <p className="text-muted">
            {org.city} · {org.businessType === "franchise" ? "Franchise network" : "Independent gym"}
          </p>
        </div>
        <Button variant="primary" onClick={() => setAssignOpen(true)}>
          Change package
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Badge tone={org.status === "active" ? "green" : org.status === "trial" ? "blue" : "orange"}>
          {org.status[0].toUpperCase() + org.status.slice(1)}
        </Badge>
        {org.trialEndsAt && org.status === "trial" && <Badge tone="gray">Trial ends {formatDate(org.trialEndsAt)}</Badge>}
      </div>

      <div className="flex flex-wrap gap-5">
        <Card className="flex-1 basis-[320px]">
          <h2 className="text-xl">Package</h2>
          {pkg ? (
            <>
              <p className="font-semibold text-lg">{pkg.name}</p>
              <p className="text-muted">
                {formatPaise(pkg.monthlyPricePaise)}/{pkg.chargeUnit}/mo · {subscription?.payer === "each_franchisee" ? "Each franchisee pays" : "Franchisor pays"}
              </p>
              <p className="text-sm text-muted">Monthly recurring revenue: <span className="font-semibold text-ink">{formatPaise(mrrPaise)}</span></p>
            </>
          ) : (
            <p className="text-muted">No package assigned yet.</p>
          )}
        </Card>

        <Card className="flex-1 basis-[320px]">
          <h2 className="text-xl">Account owner</h2>
          <p className="font-semibold">{owner?.name ?? "—"}</p>
          <p className="text-muted">{owner?.email}</p>
          <p className="text-sm text-muted mt-2">{memberCount} members across all branches</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl">Network structure</h2>
        {network.companyBranches.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-muted">Company-owned branches</p>
            <ul className="flex flex-col gap-1.5">
              {network.companyBranches.map((b) => (
                <li key={b.id} className="flex justify-between px-3 py-2 rounded-lg bg-bg">
                  <span>{b.name}</span>
                  <span className="text-muted">{b.memberCount} members</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {network.franchisees.map((f) => (
          <div key={f.id} className="border border-line rounded-xl p-3.5 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold">{f.name}</span>
              <Badge tone={f.status === "active" ? "green" : "gray"}>{f.status}</Badge>
            </div>
            <ul className="flex flex-col gap-1.5">
              {f.branches.map((b) => (
                <li key={b.id} className="flex justify-between px-3 py-2 rounded-lg bg-bg">
                  <span>{b.name}</span>
                  <span className="text-muted">{b.memberCount} members</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {network.companyBranches.length === 0 && network.franchisees.length === 0 && <p className="text-muted">No branches yet.</p>}
      </Card>

      <Card>
        <h2 className="text-xl">Platform invoices</h2>
        {invoices.length === 0 ? (
          <p className="text-muted">No invoices yet — generated automatically when the trial ends or a billing period closes.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {invoices.map((inv) => (
              <li key={inv._id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-bg">
                <span className="text-sm text-muted">
                  {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                </span>
                <span className="font-semibold">{formatPaise(inv.totalPaise)}</span>
                <Badge tone={inv.status === "paid" ? "green" : inv.status === "failed" ? "orange" : "gray"}>
                  {inv.status[0].toUpperCase() + inv.status.slice(1)}
                </Badge>
                {inv.status !== "paid" && (
                  <Button onClick={() => markPaid(inv._id)} disabled={markingPaidId === inv._id}>
                    {markingPaidId === inv._id ? "Marking…" : "Mark paid"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <AssignPackageDialog open={assignOpen} onClose={() => setAssignOpen(false)} gymId={id} onAssigned={load} />
    </>
  );
}
