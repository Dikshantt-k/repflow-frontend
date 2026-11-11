"use client";

import { useEffect, useState } from "react";
import { adminApi, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Button, EmptyState, Field, Input, Spinner } from "@/components/ui";
import type { AuditLogRow, Pagination } from "@/types/api";

const PAGE_SIZE = 50;

function actorLabel(actor: AuditLogRow["actorUserId"]): string {
  if (typeof actor === "string") return actor;
  return actor.name ?? actor.email;
}

function orgLabel(orgId: AuditLogRow["orgId"]): string {
  if (!orgId) return "Platform";
  if (typeof orgId === "string") return orgId;
  return orgId.name;
}

function metadataSummary(metadata?: Record<string, unknown>): string {
  if (!metadata) return "—";
  const entries = Object.entries(metadata).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return "—";
  return entries.map(([k, v]) => `${k}: ${v}`).join(" · ");
}

export default function PlatformAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogRow[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .auditLogs({ page, pageSize: PAGE_SIZE, action: action || undefined })
      .then((res) => {
        if (cancelled) return;
        setLogs(res.logs);
        setPagination(res.pagination);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Couldn't load the activity log.");
      });
    return () => {
      cancelled = true;
    };
  }, [page, action]);

  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1>Activity log</h1>
        <p className="text-muted mt-1">Every action across every gym on the platform, newest first.</p>
      </div>

      <Field label="Filter by action">
        <Input
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          placeholder="e.g. package, invoice, member"
          className="max-w-[260px]"
        />
      </Field>

      {error && <p className="text-sm font-semibold text-warn">{error}</p>}

      <div className="bg-surface border border-line rounded-[14px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">When</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Gym</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Actor</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Action</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Details</th>
              </tr>
            </thead>
            <tbody>
              {!logs ? (
                <tr>
                  <td colSpan={5} className="p-6">
                    <Spinner />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState>No activity recorded yet.</EmptyState>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="border-t border-line2">
                    <td className="p-3 whitespace-nowrap">
                      {formatDate(log.createdAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    </td>
                    <td className="p-3">{orgLabel(log.orgId)}</td>
                    <td className="p-3">{actorLabel(log.actorUserId)}</td>
                    <td className="p-3 font-mono text-sm">{log.action}</td>
                    <td className="p-3 text-sm text-muted">{metadataSummary(log.metadata)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between gap-4 p-3 border-t border-line2">
            <span className="text-sm text-muted">
              Page {pagination.page} of {totalPages} · {pagination.total} total
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
      </div>
    </div>
  );
}
