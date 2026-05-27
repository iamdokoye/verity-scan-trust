"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiGetPlatformStats, type PlatformStats } from "@/lib/api";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function severityBadge(severity: string) {
  if (severity === "critical")
    return (
      <Badge variant="destructive" className="text-[10px]">
        Critical
      </Badge>
    );
  if (severity === "warning")
    return (
      <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 text-[10px]">
        Warning
      </Badge>
    );
  return (
    <Badge variant="secondary" className="text-[10px]">
      Info
    </Badge>
  );
}

function actionLabel(action: string) {
  return action
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: typeof Building2;
  label: string;
  value: number | string;
  sub?: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary/10 text-secondary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4">
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-semibold text-foreground">
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
        )}
        <div className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {sub && (
          <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
        )}
      </div>
    </div>
  );
}

// ── Document status bar ──────────────────────────────────────────────────────

function DocStatusBar({
  counts,
  total,
}: {
  counts: Record<string, number>;
  total: number;
}) {
  if (total === 0) return <p className="text-xs text-muted-foreground">No documents yet.</p>;

  const segments = [
    { key: "approved", color: "bg-green-500", label: "Approved" },
    { key: "pending_approval", color: "bg-amber-400", label: "Pending" },
    { key: "rejected", color: "bg-red-400", label: "Rejected" },
    { key: "superseded", color: "bg-blue-400", label: "Superseded" },
    { key: "revoked", color: "bg-slate-400", label: "Revoked" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full">
        {segments.map(({ key, color }) => {
          const pct = ((counts[key] ?? 0) / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={key}
              className={`${color} transition-all`}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map(({ key, color, label }) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={`h-2 w-2 rounded-full ${color}`} />
            {label}: <span className="font-medium text-foreground">{counts[key] ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGetPlatformStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalDocs = stats?.totalDocuments ?? 0;
  const pendingCount = stats?.documentsByStatus?.pending_approval ?? 0;

  return (
    <div>
      {/* Page heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide overview of institutions, records, and activity.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load stats: {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Institutions"
          value={stats?.totalInstitutions ?? 0}
          loading={loading}
        />
        <StatCard
          icon={Users}
          label="Total Students"
          value={stats?.totalStudents ?? 0}
          loading={loading}
        />
        <StatCard
          icon={FileText}
          label="Total Documents"
          value={stats?.totalDocuments ?? 0}
          sub={pendingCount > 0 ? `${pendingCount} pending approval` : undefined}
          loading={loading}
        />
        <StatCard
          icon={ShieldCheck}
          label="Verifications"
          value={stats?.totalVerifications ?? 0}
          loading={loading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left column: alerts + document breakdown */}
        <div className="space-y-6 lg:col-span-2">
          {/* Alerts */}
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">
                Recent Alerts
              </h3>
            </div>
            {loading ? (
              <div className="divide-y divide-border">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="px-5 py-3">
                    <Skeleton className="mb-1.5 h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : stats?.recentAlerts.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <CheckCircle2 className="mb-2 h-6 w-6 text-green-500" />
                <p className="text-sm text-muted-foreground">No alerts</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {stats?.recentAlerts.map((alert) => (
                  <li key={alert.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-foreground">
                        {actionLabel(alert.action)}
                      </span>
                      {severityBadge(alert.severity)}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{alert.actor?.email ?? "System"}</span>
                      <span>·</span>
                      <span>{formatDate(alert.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Document status breakdown */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Document Status
            </h3>
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <DocStatusBar
                counts={stats?.documentsByStatus ?? {}}
                total={totalDocs}
              />
            )}
          </div>
        </div>

        {/* Right column: recent activity */}
        <div className="rounded-lg border border-border bg-card lg:col-span-3">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Recent Activity
            </h3>
          </div>
          {loading ? (
            <div className="divide-y divide-border">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="px-5 py-3">
                  <Skeleton className="mb-1.5 h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))}
            </div>
          ) : stats?.recentActivity.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              No activity yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {stats?.recentActivity.map((entry) => (
                <li key={entry.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {actionLabel(entry.action)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {entry.actor?.fullName ?? entry.actor?.email ?? "System"}
                        {entry.targetType && ` · ${entry.targetType}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {severityBadge(entry.severity)}
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(entry.createdAt)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
