"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  ClipboardList,
  Clock,
  FileCheck2,
  FileDown,
  FileText,
  ScrollText,
  ShieldCheck,
  ShieldOff,
  Upload,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { apiGetAdminStats, type AdminStats } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/votta/GlassCard";
import { PageHeader } from "@/components/votta/PortalShell";

const QUICK_ACTIONS = [
  { label: "Add student", icon: UserPlus, to: "/admin/students" },
  { label: "Upload document", icon: Upload, to: "/admin/documents/upload" },
  { label: "Enter results", icon: ClipboardList, to: "/admin/results/new" },
  { label: "Generate transcript", icon: FileDown, to: "/admin/students" },
];

function activityIcon(action: string): { icon: LucideIcon; cls: string } {
  const a = action.toUpperCase();
  if (/REVOK|TAMPER|DELETE|REJECT/.test(a)) return { icon: ShieldOff, cls: "text-destructive" };
  if (/APPROV|SIGN/.test(a)) return { icon: FileCheck2, cls: "text-accent" };
  if (/UPLOAD/.test(a)) return { icon: Upload, cls: "text-muted-foreground" };
  if (/VERIF/.test(a)) return { icon: BadgeCheck, cls: "text-success" };
  return { icon: ScrollText, cls: "text-muted-foreground" };
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  index,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  loading?: boolean;
  index: number;
}) {
  return (
    <GlassCard glossy className="animate-rise p-4 sm:p-5" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs text-muted-foreground sm:text-sm">{label}</span>
        <Icon className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-20" />
      ) : (
        <p className="tabular mt-2 font-display text-2xl font-extrabold sm:text-3xl">{value}</p>
      )}
    </GlassCard>
  );
}

export default function AdminDash() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetAdminStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const activity = stats?.recentActivity ?? [];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of records, verifications and recent activity."
        actions={
          <Button variant="hero" asChild>
            <Link href="/admin/students">
              <UserPlus strokeWidth={1.75} /> New student
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard index={0} icon={Users} label="Total students" value={stats?.totalStudents.toLocaleString() ?? "—"} loading={loading} />
        <StatCard index={1} icon={FileText} label="Total documents" value={stats?.totalDocuments.toLocaleString() ?? "—"} loading={loading} />
        <StatCard index={2} icon={ShieldCheck} label="Verifications today" value={stats?.verificationsToday != null ? String(stats.verificationsToday) : "—"} loading={loading} />
        <StatCard index={3} icon={Clock} label="Pending approval" value={stats?.pendingDocuments != null ? String(stats.pendingDocuments) : "—"} loading={loading} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <GlassCard className="p-5 lg:order-1">
          <h2 className="text-base font-bold">Quick actions</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.label}
                href={a.to}
                className="glass-subtle flex min-h-24 flex-col justify-between gap-3 rounded-xl p-4 text-left transition-transform hover:-translate-y-0.5"
              >
                <a.icon className="h-5 w-5 text-accent" strokeWidth={1.75} />
                <span className="text-sm font-semibold">{a.label}</span>
              </Link>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5 lg:order-2">
          <h2 className="text-base font-bold">Recent activity</h2>
          {loading ? (
            <div className="mt-4 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <ol className="mt-4">
              {activity.map((e, i) => {
                const k = activityIcon(e.action);
                return (
                  <li key={e.id} className="relative grid grid-cols-[auto_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
                    {i < activity.length - 1 && (
                      <span className="absolute top-10 bottom-0 left-[1.1875rem] w-px bg-border" />
                    )}
                    <span className={`glass-strong grid h-10 w-10 place-items-center rounded-full ${k.cls}`}>
                      <k.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-semibold capitalize">
                          {e.action.toLowerCase().replace(/[_.]/g, " ")}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(e.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.actor?.fullName ?? e.actor?.email ?? "System"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </GlassCard>
      </div>
    </>
  );
}
