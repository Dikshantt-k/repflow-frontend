"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { meApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate, daysLeft, formatPaise } from "@/lib/format";
import { Badge, Button, Card, Spinner } from "@/components/ui";
import type { MeMemberSummary } from "@/types/api";

export default function MemberHomePage() {
  const { user } = useAuth();
  const [data, setData] = useState<MeMemberSummary | null>(null);

  useEffect(() => {
    meApi.summary().then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const { member, membership, branch, visitsThisMonth } = data;
  const left = membership ? daysLeft(membership.endDate) : null;
  const expiringSoon = left !== null && left <= 7;

  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <h1 className="text-2xl">Hi {user?.name?.split(" ")[0] ?? member.firstName}</h1>
        <p className="text-muted">{branch?.name}</p>
      </div>

      {membership && (expiringSoon || member.status === "expired") && (
        <Card className={member.status === "expired" ? "bg-warn-soft border-transparent" : "bg-accent-soft border-transparent"}>
          <div className="flex justify-between items-start gap-2">
            <div>
              <p className="font-semibold">{membership.planName}</p>
              <p className="text-sm">
                {member.status === "expired" ? "Expired" : "Ends"} {formatDate(membership.endDate)}
              </p>
            </div>
            {left !== null && <Badge tone={member.status === "expired" ? "orange" : "blue"}>{left > 0 ? `${left}d left` : left === 0 ? "Last day" : "Expired"}</Badge>}
          </div>
          <Link href="/member/renew">
            <Button variant="primary" className="w-full mt-1">
              Renew membership
            </Button>
          </Link>
        </Card>
      )}

      <Card className="items-center text-center py-6">
        <p className="text-sm text-muted">Check-in ID</p>
        <p className="font-display text-3xl font-bold tracking-wider">{member.memberCode}</p>
        <p className="text-sm text-muted">Show this at the front desk to check in.</p>
      </Card>

      <div className="grid grid-cols-2 gap-2.5">
        <Card className="items-center text-center gap-1 py-4">
          <span className="font-display text-2xl font-semibold">{visitsThisMonth}</span>
          <span className="text-sm text-muted">Visits this month</span>
        </Card>
        <Card className="items-center text-center gap-1 py-4">
          <span className="font-display text-2xl font-semibold">{member.duesPaise > 0 ? formatPaise(member.duesPaise) : "—"}</span>
          <span className="text-sm text-muted">Dues</span>
        </Card>
      </div>
    </div>
  );
}
