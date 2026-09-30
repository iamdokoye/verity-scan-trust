"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/votta/GlassCard";
import { PageHeader } from "@/components/votta/PortalShell";
import {
  apiGetMyStudent,
  apiGetStudentDocuments,
  apiGetStudentResults,
  type StudentDetail,
  type VottaDocument,
  type AcademicSummary,
} from "@/lib/api";

/** Nigerian five-point CGPA scale. */
const CGPA_SCALE = 5;

function CgpaRing({ cgpa }: { cgpa: number | null }) {
  const r = 70;
  const len = 2 * Math.PI * r;
  const pct = cgpa != null ? Math.min(cgpa / CGPA_SCALE, 1) : 0;
  return (
    <div className="relative h-44 w-44 shrink-0">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="cg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="var(--blue)" />
            <stop offset="1" stopColor="var(--blue-bright)" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--border)" strokeWidth="12" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke="url(#cg)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - pct)}
          className="animate-fill-ring"
          style={{ ["--ring-len" as string]: len }}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="tabular font-display text-4xl font-extrabold">
          {cgpa != null ? cgpa.toFixed(2) : "—"}
        </span>
        <span className="text-xs text-muted-foreground">of {CGPA_SCALE.toFixed(2)} CGPA</span>
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
  const cgpa = summary?.cgpa ?? null;

  return (
    <>
      <PageHeader
        title={loading ? "Welcome back" : `Welcome back, ${student?.fullName?.split(" ")[0] ?? "Student"}`}
        description={
          [student?.institution?.name, student?.matricNumber].filter(Boolean).join(" · ") || undefined
        }
      />

      <GlassCard glossy tier="strong" className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:p-8">
        {loading ? <Skeleton className="h-44 w-44 rounded-full" /> : <CgpaRing cgpa={cgpa} />}
        <div className="grid w-full flex-1 grid-cols-2 gap-3">
          {[
            ["Class of degree", summary?.degreeClass ?? "—"],
            ["Matric number", student?.matricNumber ?? "—"],
            ["Semesters completed", String(summary?.sessions.length ?? 0)],
            ["Approved documents", String(approvedDocs.length)],
          ].map(([k, v]) => (
            <div key={k} className="glass-subtle rounded-xl p-4">
              <p className="text-xs text-muted-foreground">{k}</p>
              {loading ? (
                <Skeleton className="mt-2 h-5 w-16" />
              ) : (
                <p className="tabular mt-1 text-sm font-bold break-words sm:text-base">{v}</p>
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="mt-8 mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Recent documents</h2>
        <Link href="/student/documents" className="text-sm font-semibold text-accent hover:underline">
          View all
        </Link>
      </div>

      {loading ? (
        <GlassCard className="divide-y divide-border/60">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </GlassCard>
      ) : approvedDocs.length === 0 ? (
        <GlassCard className="px-6 py-10 text-center text-sm text-muted-foreground">
          No approved documents yet.
        </GlassCard>
      ) : (
        <ul className="grid gap-3">
          {approvedDocs.slice(0, 3).map((d, i) => (
            <li key={d.id}>
              <GlassCard
                className="animate-rise flex items-center gap-4 p-4"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white"
                  style={{ background: "var(--gradient-primary)", boxShadow: "inset 0 1px 0 var(--glass-highlight)" }}
                >
                  <FileText className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold capitalize">
                    {d.documentType.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="glass" size="sm" asChild>
                  <Link href="/student/share">
                    <Share2 strokeWidth={1.75} /> Share
                  </Link>
                </Button>
              </GlassCard>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
