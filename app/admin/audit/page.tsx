"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { PageTitle } from "@/components/votta/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiListAuditLogs, type AuditEntry } from "@/lib/api";

const ACTION_COLORS: Record<string, string> = {
  DOCUMENT_UPLOADED: "bg-secondary/10 text-secondary",
  DOCUMENT_APPROVED: "bg-success/10 text-success",
  DOCUMENT_REJECTED: "bg-destructive/10 text-destructive",
  DOCUMENT_SUPERSEDED: "bg-warning/15 text-foreground",
  DOCUMENT_REVOKED: "bg-destructive/10 text-destructive",
  TRANSCRIPT_GENERATED: "bg-success/10 text-success",
  VERIFICATION_PERFORMED: "bg-success/10 text-success",
  USER_LOGIN: "bg-muted text-muted-foreground",
  USER_LOGOUT: "bg-muted text-muted-foreground",
  RESULT_CREATED: "bg-secondary/10 text-secondary",
  RESULT_LOCKED: "bg-warning/15 text-foreground",
  CROSS_STUDENT_DUPLICATE: "bg-destructive/10 text-destructive",
};

const ACTION_FILTERS = [
  "",
  "DOCUMENT_UPLOADED",
  "DOCUMENT_APPROVED",
  "TRANSCRIPT_GENERATED",
  "VERIFICATION_PERFORMED",
  "RESULT_CREATED",
  "USER_LOGIN",
  "CROSS_STUDENT_DUPLICATE",
];

function formatAction(action: string) {
  return action.toLowerCase().replace(/_/g, " ");
}

function actorLabel(entry: AuditEntry) {
  return entry.actor?.fullName || entry.actor?.email || entry.actorId || "System";
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [date, setDate] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 50;

  const dateRange = useMemo(() => {
    if (!date) return {};
    const from = new Date(`${date}T00:00:00.000`);
    const to = new Date(`${date}T23:59:59.999`);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [date]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiListAuditLogs({
        page,
        pageSize,
        action: action || undefined,
        q: query.trim() || undefined,
        ...dateRange,
      });
      setLogs(result.items);
      setTotal(result.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, [action, dateRange, page, query]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageTitle title="Audit Log" />

      <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Input
          type="date"
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            setPage(1);
          }}
        />
        <select
          className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All actions</option>
          {ACTION_FILTERS.filter(Boolean).map((item) => (
            <option key={item} value={item}>
              {formatAction(item)}
            </option>
          ))}
        </select>
        <Input
          placeholder="Search target or IP..."
          className="lg:col-span-2"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-md border border-warning/40 bg-warning/15 px-4 py-2 text-xs text-foreground">
        <Lock className="h-3.5 w-3.5" />
        This log is append-only. Entries cannot be modified or deleted.
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={loadLogs}>
              Retry
            </Button>
          </div>
        ) : logs.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            No audit logs found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Timestamp</th>
                <th className="px-5 py-3 text-left font-medium">Actor</th>
                <th className="px-5 py-3 text-left font-medium">Action</th>
                <th className="px-5 py-3 text-left font-medium">Target</th>
                <th className="px-5 py-3 text-left font-medium">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-foreground">{actorLabel(entry)}</div>
                    <span className="mt-0.5 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {entry.actor?.role ?? entry.actorRole ?? "system"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${
                        ACTION_COLORS[entry.action] || "bg-muted text-muted-foreground"
                      }`}
                    >
                      {formatAction(entry.action)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-foreground">
                    {entry.targetType ?? "Record"}
                    {entry.targetId ? (
                      <div className="font-mono text-xs text-muted-foreground">
                        {entry.targetId}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                    {entry.ipAddress ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <span>
            Showing {logs.length ? (page - 1) * pageSize + 1 : 0}-
            {Math.min(page * pageSize, total)} of {total}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
