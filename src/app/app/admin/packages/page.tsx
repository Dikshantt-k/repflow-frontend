"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { formatPaise } from "@/lib/format";
import { Badge, Button, Card } from "@/components/ui";
import { PackageDialog } from "@/components/PackageDialog";
import type { Package } from "@/types/api";

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [editing, setEditing] = useState<Package | "new" | null>(null);

  function load() {
    adminApi.listPackages().then((res) => setPackages(res.packages));
  }

  useEffect(load, []);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Packages</h1>
        <Button variant="primary" onClick={() => setEditing("new")}>
          + New package
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages?.map((pkg) => (
          <Card key={pkg._id}>
            <div className="flex justify-between items-start gap-2">
              <h2 className="text-xl">{pkg.name}</h2>
              <Badge tone={pkg.isPublic ? "green" : "violet"}>{pkg.isPublic ? "Public" : "Private"}</Badge>
            </div>
            <p className="text-muted text-sm">{pkg.description}</p>
            <p className="font-display text-2xl font-semibold">
              {formatPaise(pkg.monthlyPricePaise)}
              <span className="text-sm text-muted font-sans">/{pkg.chargeUnit === "branch" ? "branch" : pkg.chargeUnit}/mo</span>
            </p>
            <p className="text-sm text-muted">Used by {pkg.usedByGyms} gym{pkg.usedByGyms === 1 ? "" : "s"}</p>
            <ul className="text-sm flex flex-col">
              <li className="flex justify-between py-1.5 border-t border-line2">
                <span className="text-muted">Branches</span>
                <span>{pkg.limits.maxBranches ?? "Unlimited"}</span>
              </li>
              <li className="flex justify-between py-1.5 border-t border-line2">
                <span className="text-muted">Members / branch</span>
                <span>{pkg.limits.membersPerBranch ?? "Unlimited"}</span>
              </li>
              <li className="flex justify-between py-1.5 border-t border-line2">
                <span className="text-muted">Staff logins</span>
                <span>{pkg.limits.staffLogins ?? "Unlimited"}</span>
              </li>
            </ul>
            <Button className="mt-auto" onClick={() => setEditing(pkg)}>
              Edit
            </Button>
          </Card>
        ))}
      </div>

      {editing && <PackageDialog initial={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} onSaved={load} />}
    </>
  );
}
