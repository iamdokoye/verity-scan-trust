"use client";

import { useEffect, useState } from "react";
import { ChevronDown, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/votta/PortalShell";
import {
  apiGetMyStudent,
  apiGetStudentResults,
  type AcademicSummary,
} from "@/lib/api";

export default function ResultsPage() {
  const [summary, setSummary] = useState<AcademicSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true });

  useEffect(() => {
    async function load() {
      try {
        const student = await apiGetMyStudent();
        const s = await apiGetStudentResults(student.id);
        setSummary(s);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load results."
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <PageTitle
        title="Academic Results"
        action={
          <Button disabled title="Transcript generation coming soon">
            <FileDown className="h-4 w-4" /> Generate Transcript
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : (
        <>
          {/* CGPA banner */}
          <div className="mb-6 flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Cumulative GPA
              </div>
              <div className="mt-1 text-5xl font-bold tracking-tight text-primary">
                {summary?.cgpa.toFixed(2) ?? "—"}
              </div>
            </div>
            {summary?.degreeClass && (
              <span className="rounded-full bg-success/10 px-4 py-2 text-sm font-semibold text-success">
                {summary.degreeClass}
              </span>
            )}
          </div>

          {(!summary || summary.sessions.length === 0) ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-base font-medium text-foreground">
                No results recorded yet
              </p>
              <p className="text-sm text-muted-foreground">
                Results will appear here once your institution enters them.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.sessions.map((s, i) => {
                const isOpen = !!open[i];
                const totalUnits = s.results.reduce(
                  (a, r) => a + r.course.creditUnits,
                  0
                );
                const weighted = s.results.reduce(
                  (a, r) => a + r.course.creditUnits * r.gradePoint,
                  0
                );
                return (
                  <div
                    key={i}
                    className="overflow-hidden rounded-lg border border-border bg-card"
                  >
                    <button
                      onClick={() =>
                        setOpen((o) => ({ ...o, [i]: !isOpen }))
                      }
                      className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/40"
                    >
                      <span className="text-sm font-semibold text-foreground">
                        {s.sessionLabel} — {s.semester}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          Semester GPA
                        </span>
                        <span className="text-base font-semibold text-primary">
                          {s.gpa.toFixed(2)}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </span>
                    </button>
                    {isOpen && (
                      <div className="border-t border-border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                            <tr>
                              <th className="px-5 py-2 text-left font-medium">
                                Code
                              </th>
                              <th className="px-5 py-2 text-left font-medium">
                                Title
                              </th>
                              <th className="px-5 py-2 text-center font-medium">
                                Units
                              </th>
                              <th className="px-5 py-2 text-center font-medium">
                                Grade
                              </th>
                              <th className="px-5 py-2 text-center font-medium">
                                Point
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.results.map((r, idx) => (
                              <tr
                                key={r.id}
                                className={
                                  idx % 2 === 0
                                    ? "bg-background"
                                    : "bg-muted/30"
                                }
                              >
                                <td className="px-5 py-2.5 font-mono text-foreground">
                                  {r.course.code}
                                </td>
                                <td className="px-5 py-2.5 text-foreground">
                                  {r.course.title}
                                </td>
                                <td className="px-5 py-2.5 text-center text-foreground">
                                  {r.course.creditUnits}
                                </td>
                                <td className="px-5 py-2.5 text-center font-semibold text-foreground">
                                  {r.grade}
                                </td>
                                <td className="px-5 py-2.5 text-center text-foreground">
                                  {r.gradePoint}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t border-border bg-muted/40 text-xs">
                            <tr>
                              <td
                                colSpan={2}
                                className="px-5 py-3 text-right font-medium text-muted-foreground"
                              >
                                Total Credit Units:{" "}
                                <span className="text-foreground">
                                  {totalUnits}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-center text-muted-foreground">
                                Weighted:{" "}
                                <span className="text-foreground">
                                  {weighted}
                                </span>
                              </td>
                              <td
                                colSpan={2}
                                className="px-5 py-3 text-center text-muted-foreground"
                              >
                                GPA:{" "}
                                <span className="font-semibold text-foreground">
                                  {s.gpa.toFixed(2)}
                                </span>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
