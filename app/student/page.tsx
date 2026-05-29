"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, CalendarDays, ShieldCheck, Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  apiGetMyStudent,
  apiGetStudentDocuments,
  apiGetStudentResults,
  type StudentDetail,
  type VottaDocument,
  type AcademicSummary,
} from "@/lib/api";

function Stat({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof FileText;
  label: string;
  value: string | number;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary/10 text-secondary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          {loading ? (
            <div className="mt-1 h-7 w-12 animate-pulse rounded bg-muted" />
          ) : (
            <div className="text-2xl font-semibold text-foreground">{value}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [docs, setDocs] = useState<VottaDocument[]>([]);
  const [summary, setSummary] = useState<AcademicSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const s = await apiGetMyStudent();
        setStudent(s);
        // Load docs and results in parallel
        const [d, r] = await Promise.allSettled([
          apiGetStudentDocuments(s.id),
          apiGetStudentResults(s.id),
        ]);
        if (d.status === "fulfilled") setDocs(d.value);
        if (r.status === "fulfilled") setSummary(r.value);
      } catch {
        // If student record not found, still render with empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const approvedDocs = docs.filter((d) => d.status === "approved");

  return (
    <div>
      {/* Welcome card */}
      <div className="mb-6 rounded-lg border border-border bg-card p-6">
        {loading ? (
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
        ) : (
          <>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Welcome back, {student?.fullName?.split(" ")[0] ?? "Student"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {student?.institution?.name ?? ""}
              {student?.matricNumber ? ` · ${student.matricNumber}` : ""}
            </p>
          </>
        )}
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat
          icon={FileText}
          label="Approved Documents"
          value={approvedDocs.length}
          loading={loading}
        />
        <Stat
          icon={CalendarDays}
          label="Semesters Completed"
          value={summary?.sessions.length ?? 0}
          loading={loading}
        />
        <Stat
          icon={ShieldCheck}
          label="CGPA"
          value={summary?.cgpa != null ? summary.cgpa.toFixed(2) : "—"}
          loading={loading}
        />
      </div>

      {/* Recent documents */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold text-foreground">
            Recent Documents
          </h3>
          <Link
            href="/student/documents"
            className="text-xs text-secondary hover:underline"
          >
            View all
          </Link>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : approvedDocs.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            No approved documents yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {approvedDocs.slice(0, 3).map((d) => (
              <li key={d.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground capitalize">
                    {d.documentType.replace(/_/g, " ")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className="hidden rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-success sm:inline-flex">
                  Approved
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/student/documents">
                    <Share2 className="h-4 w-4" /> Share
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
