"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import { formatPaise } from "@/lib/format";
import { Badge, Card, EmptyState, Field, Input, Kpi, Pill, Spinner } from "@/components/ui";
import type { AdminGymRow, AdminGymsKpis, OrgStatus } from "@/types/api";

const STATUS_FILTERS = ["all", "active", "trial", "grace", "suspended"] as const;

function statusBadge(status: OrgStatus) {
  if (status === "active") return <Badge tone="green">Active</Badge>;
  if (status === "trial") return <Badge tone="blue">Trial</Badge>;
  if (status === "grace") return <Badge tone="orange">Grace</Badge>;
  return <Badge tone="gray">Suspended</Badge>;
}

export default function AdminGymsPage() {
  const [gyms, setGyms] = useState<AdminGymRow[] | null>(null);
  const [kpis, setKpis] = useState<AdminGymsKpis | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");

  useEffect(() => {
    adminApi.listGyms().then((res) => {
      setGyms(res.gyms);
      setKpis(res.kpis);
    });
  }, []);

  const rows = useMemo(() => {
    if (!gyms) return [];
    const q = search.trim().toLowerCase();
    return gyms.filter((g) => (status === "all" || g.status === status) && (!q || g.name.toLowerCase().includes(q) || g.city?.toLowerCase().includes(q)));
  }, [gyms, search, status]);

  if (!gyms || !kpis) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <h1 className="text-3xl">Gyms</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Client gyms" value={kpis.clientGyms} />
        <Kpi label="Branches live" value={kpis.branchesLive} />
        <Kpi label="On trial" value={kpis.onTrial} />
        <Kpi label="Monthly recurring revenue" value={formatPaise(kpis.mrrPaise)} sub="excl. GST" />
        <Kpi label="Overdue" value={kpis.overdue} sub={formatPaise(kpis.overduePaise)} warn={kpis.overdue > 0} />
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <Field label="Search">
            <Input placeholder="Gym or city" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          </Field>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map((s) => (
              <Pill key={s} active={status === s} onClick={() => setStatus(s)}>
                {s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)}
              </Pill>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState>No gyms match that filter.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-sm text-muted">
                  <th className="p-3 bg-line2 rounded-l-lg">Gym</th>
                  <th className="p-3 bg-line2">Type</th>
                  <th className="p-3 bg-line2 text-right">Franchisees</th>
                  <th className="p-3 bg-line2 text-right">Branches</th>
                  <th className="p-3 bg-line2">Package</th>
                  <th className="p-3 bg-line2">Status</th>
                  <th className="p-3 bg-line2 text-right rounded-r-lg">MRR</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((g) => (
                  <tr key={g.id} className="border-t border-line2 hover:bg-line2">
                    <td className="p-3">
                      <Link href={`/app/admin/gyms/${g.id}`} className="font-semibold text-link">
                        {g.name}
                      </Link>
                      <div className="text-sm text-muted">{g.city}</div>
                    </td>
                    <td className="p-3">{g.businessType === "franchise" ? <Badge tone="violet">Franchise network</Badge> : "Independent"}</td>
                    <td className="p-3 text-right">{g.franchiseeCount || "—"}</td>
                    <td className="p-3 text-right">{g.branchCount}</td>
                    <td className="p-3">{g.packageName ?? "—"}</td>
                    <td className="p-3">{statusBadge(g.status)}</td>
                    <td className="p-3 text-right font-semibold">{formatPaise(g.mrrPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
