"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  FileText,
  ShieldCheck,
  Clock,
  UserPlus,
  Upload,
  ClipboardList,
  FileDown,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { apiGetAdminStats, type AdminStats } from "@/lib/api";

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  loading,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  trend?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary/10 text-secondary">
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
            <ArrowUpRight className="h-3 w-3" /> {trend}
          </span>
        )}
      </div>
      {loading ? (
        <div className="mt-4 h-8 w-16 animate-pulse rounded bg-muted" />
      ) : (
        <div className="mt-4 text-2xl font-semibold text-foreground">{value}</div>
      )}
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "Add Student", icon: UserPlus, to: "/admin/students" },
  { label: "Upload Document", icon: Upload, to: "/admin/documents/upload" },
  { label: "Enter Results", icon: ClipboardList, to: "/admin/results/new" },
  { label: "Generate Transcript", icon: FileDown, to: "/admin/students" },
];

export default function AdminDash() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetAdminStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Overview of records, verifications and recent activity.
        </p>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Students"
          value={stats?.totalStudents.toLocaleString() ?? "—"}
          loading={loading}
        />
        <StatCard
          icon={FileText}
          label="Total Documents"
          value={stats?.totalDocuments.toLocaleString() ?? "—"}
          loading={loading}
        />
        <StatCard
          icon={ShieldCheck}
          label="Verifications Today"
          value={stats?.verificationsToday != null ? String(stats.verificationsToday) : "—"}
          loading={loading}
        />
        <StatCard
          icon={Clock}
          label="Pending Approval"
          value={stats?.pendingDocuments != null ? String(stats.pendingDocuments) : "—"}
          loading={loading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent activity */}
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-base font-semibold text-foreground">
              Recent Activity
            </h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (stats?.recentActivity ?? []).length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No recent activity.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {(stats?.recentActivity ?? []).map((e) => (
                <li key={e.id} className="px-5 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">
                      {e.actor?.fullName ?? e.actor?.email ?? "System"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    <span className="capitalize text-foreground">
                      {e.action.toLowerCase().replace(/_/g, " ")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick actions */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-base font-semibold text-foreground">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.label}
                href={a.to}
                className="flex flex-col items-center justify-center gap-2 rounded-md border border-border bg-background p-5 text-center text-sm font-medium text-foreground transition-colors hover:border-secondary hover:bg-secondary/5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <a.icon className="h-5 w-5" />
                </div>
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
