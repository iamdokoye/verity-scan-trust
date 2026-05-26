"use client";

import { useState } from "react";
import { ChevronDown, FileDown } from "lucide-react";
import { semesters, student } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/votta/PortalShell";

export default function ResultsPage() {
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true });

  return (
    <div>
      <PageTitle
        title="Academic Results"
        action={
          <Button>
            <FileDown className="h-4 w-4" /> Generate Transcript
          </Button>
        }
      />

      <div className="mb-6 flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Cumulative GPA
          </div>
          <div className="mt-1 text-5xl font-bold tracking-tight text-primary">
            {student.cgpa.toFixed(2)}
          </div>
        </div>
        <span className="rounded-full bg-success/10 px-4 py-2 text-sm font-semibold text-success">
          {student.degreeClass}
        </span>
      </div>

      <div className="space-y-3">
        {semesters.map((s, i) => {
          const isOpen = !!open[i];
          const totalUnits = s.courses.reduce((a, c) => a + c.units, 0);
          const weighted = s.courses.reduce((a, c) => a + c.units * c.point, 0);
          return (
            <div
              key={i}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <button
                onClick={() => setOpen((o) => ({ ...o, [i]: !isOpen }))}
                className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/40"
              >
                <span className="text-sm font-semibold text-foreground">
                  {s.label}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    Semester GPA
                  </span>
                  <span className="text-base font-semibold text-primary">
                    {s.gpa.toFixed(2)}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-5 py-2 text-left font-medium">
                          Course Code
                        </th>
                        <th className="px-5 py-2 text-left font-medium">
                          Course Title
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
                      {s.courses.map((c, idx) => (
                        <tr
                          key={c.code}
                          className={
                            idx % 2 === 0 ? "bg-background" : "bg-muted/30"
                          }
                        >
                          <td className="px-5 py-2.5 font-mono text-foreground">
                            {c.code}
                          </td>
                          <td className="px-5 py-2.5 text-foreground">
                            {c.title}
                          </td>
                          <td className="px-5 py-2.5 text-center text-foreground">
                            {c.units}
                          </td>
                          <td className="px-5 py-2.5 text-center font-semibold text-foreground">
                            {c.grade}
                          </td>
                          <td className="px-5 py-2.5 text-center text-foreground">
                            {c.point}
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
                          <span className="text-foreground">{totalUnits}</span>
                        </td>
                        <td className="px-5 py-3 text-center text-muted-foreground">
                          Weighted:{" "}
                          <span className="text-foreground">{weighted}</span>
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
    </div>
  );
}
