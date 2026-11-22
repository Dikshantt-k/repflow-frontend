"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { membersApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import { formatDate, formatPaise, initials } from "@/lib/format";
import { Avatar, Button, EmptyState, Input, Pill, Spinner, statusBadge } from "@/components/ui";
import { ImportMembersDialog } from "@/components/ImportMembersDialog";
import type { ListMembersParams } from "@/lib/api";
import type { MemberListRow, Pagination } from "@/types/api";

type StatusFilter = NonNullable<ListMembersParams["status"]>;

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring" },
  { value: "expired", label: "Expired" },
  { value: "frozen", label: "Frozen" },
];

const PAGE_SIZE = 25;

/** Applies ?q= and ?status= (e.g. from the sidebar search or dashboard links) to the list filters. */
function UrlFilters({ onSearch, onStatus }: { onSearch: (q: string) => void; onStatus: (s: StatusFilter) => void }) {
  const params = useSearchParams();
  useEffect(() => {
    const q = params.get("q");
    const st = params.get("status");
    if (q !== null) onSearch(q);
    if (st && STATUS_FILTERS.some((f) => f.value === st)) onStatus(st as StatusFilter);
  }, [params, onSearch, onStatus]);
  return null;
}

export default function MembersListPage() {
  const { context } = useAuth();
  const canManage = can.createMember(context?.role);
  const showFinancials = context?.role !== "trainer";
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const [members, setMembers] = useState<MemberListRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Debounce free-text search.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    // Fetch-on-filter-change: setting loading/error state here (not just in the
    // async callback) is intentional so the table shows a spinner immediately.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    membersApi
      .list({ search: search || undefined, status, page, pageSize: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setMembers(res.members);
        setPagination(res.pagination);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Couldn't load members.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [search, status, page, reloadKey]);

  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-5">
      <Suspense fallback={null}>
        <UrlFilters onSearch={setSearchInput} onStatus={setStatus} />
      </Suspense>
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl">{pagination ? pagination.total : "…"} members in your branches</h1>
        </div>
        {canManage && (
          <div className="flex gap-2.5">
            <Button onClick={() => setImportOpen(true)}>Import CSV</Button>
            <Link
              href="/app/members/new"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-[10px] font-semibold text-sm bg-accent border border-accent text-on-accent hover:bg-accent-hover"
            >
              + Add member
            </Link>
          </div>
        )}
      </div>

      <ImportMembersDialog open={importOpen} onClose={() => setImportOpen(false)} onImported={() => setReloadKey((k) => k + 1)} />

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 basis-60 max-w-90">
          <Input placeholder="Search by name, phone or member ID" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <Pill key={f.value} active={status === f.value} onClick={() => { setStatus(f.value); setPage(1); }}>
              {f.label}
            </Pill>
          ))}
        </div>
      </div>

      {error && <p className="text-sm font-semibold text-warn">{error}</p>}

      <div className="bg-surface border border-line rounded-[14px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Member</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Plan</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Branch</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Status</th>
                {showFinancials && <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Dues</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-6">
                    <Spinner />
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState>No members match these filters.</EmptyState>
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="border-t border-line2 hover:bg-line2">
                    <td className="p-3">
                      <Link href={`/app/members/${m.id}`} className="flex items-center gap-3">
                        <Avatar label={initials(m.firstName, m.lastName)} />
                        <span className="flex flex-col">
                          <span className="font-semibold text-ink">
                            {m.firstName} {m.lastName ?? ""}
                          </span>
                          <span className="text-sm text-muted">{m.phone}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="p-3">
                      {m.plan ? (
                        <span className="flex flex-col">
                          <span>{m.plan.name}</span>
                          <span className="text-sm text-muted">Ends {formatDate(m.plan.endDate)}</span>
                        </span>
                      ) : (
                        <span className="text-muted">No plan</span>
                      )}
                    </td>
                    <td className="p-3">{m.branchName ?? "—"}</td>
                    <td className="p-3">{statusBadge(m.status)}</td>
                    {showFinancials && (
                      <td className="p-3">
                        {m.duesPaise ? <span className="font-semibold text-warn">{formatPaise(m.duesPaise)}</span> : <span className="text-muted">—</span>}
                      </td>
                    )}
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
