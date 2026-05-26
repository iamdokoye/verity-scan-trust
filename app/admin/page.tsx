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
} from "lucide-react";
import { adminStats, auditLog } from "@/lib/mock-data";

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  trend?: string;
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
      <div className="mt-4 text-2xl font-semibold text-foreground">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

export default function AdminDash() {
  const actions = [
    { label: "Add Student", icon: UserPlus, to: "/admin/students" },
    { label: "Upload Document", icon: Upload, to: "/admin/documents/upload" },
    { label: "Enter Results", icon: ClipboardList, to: "/admin/results/new" },
    { label: "Generate Transcript", icon: FileDown, to: "/admin/students" },
  ];

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

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Students"
          value={adminStats.totalStudents.toLocaleString()}
          trend="+2.4%"
        />
        <StatCard
          icon={FileText}
          label="Total Documents"
          value={adminStats.totalDocuments.toLocaleString()}
          trend="+1.1%"
        />
        <StatCard
          icon={ShieldCheck}
          label="Verifications Today"
          value={String(adminStats.verificationsToday)}
          trend="+12%"
        />
        <StatCard
          icon={Clock}
          label="Pending Uploads"
          value={String(adminStats.pendingUploads)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-base font-semibold text-foreground">
              Recent Activity
            </h3>
          </div>
          <ul className="divide-y divide-border">
            {auditLog.slice(0, 5).map((e, i) => (
              <li key={i} className="px-5 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{e.actor}</span>
                  <span className="text-xs text-muted-foreground">{e.ts}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  <span className="text-foreground">{e.action}</span> ·{" "}
                  {e.target}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-base font-semibold text-foreground">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {actions.map((a) => (
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
