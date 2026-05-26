"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { studentList } from "@/lib/mock-data";

const GRADES: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
type Row = { code: string; title: string; units: number; grade: keyof typeof GRADES | "" };

export default function EnterResults() {
  const [rows, setRows] = useState<Row[]>([
    { code: "", title: "", units: 3, grade: "" },
  ]);

  const gpa = useMemo(() => {
    const valid = rows.filter((r) => r.grade && r.units > 0);
    const totalUnits = valid.reduce((a, r) => a + Number(r.units), 0);
    const weighted = valid.reduce(
      (a, r) => a + Number(r.units) * GRADES[r.grade as string],
      0
    );
    return totalUnits ? weighted / totalUnits : 0;
  }, [rows]);

  const update = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
        Enter Semester Results
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Step through student selection and course entries.
      </p>

      <div className="mb-6 rounded-lg border border-border bg-card p-6">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-secondary">
          Step 1
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Student
            </label>
            <Input placeholder="Search student…" list="students" />
            <datalist id="students">
              {studentList.map((s) => (
                <option
                  key={s.matric}
                  value={`${s.name} (${s.matric})`}
                />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Academic Session
            </label>
            <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option>2023/2024 — Second Semester</option>
              <option>2023/2024 — First Semester</option>
              <option>2022/2023 — Second Semester</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Step 2
            </div>
            <div className="text-sm font-medium text-foreground">
              Course entries
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setRows((r) => [
                ...r,
                { code: "", title: "", units: 3, grade: "" },
              ])
            }
          >
            <Plus className="h-4 w-4" /> Add Course
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">
                  Course Code
                </th>
                <th className="px-3 py-2 text-left font-medium">
                  Course Title
                </th>
                <th className="px-3 py-2 text-center font-medium">Units</th>
                <th className="px-3 py-2 text-center font-medium">Grade</th>
                <th className="px-3 py-2 text-center font-medium">Point</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-2">
                    <Input
                      value={r.code}
                      onChange={(e) => update(i, { code: e.target.value })}
                      placeholder="CSC 401"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={r.title}
                      onChange={(e) => update(i, { title: e.target.value })}
                      placeholder="Course title"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min={1}
                      max={6}
                      value={r.units}
                      onChange={(e) =>
                        update(i, { units: Number(e.target.value) })
                      }
                      className="w-20 text-center"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={r.grade}
                      onChange={(e) =>
                        update(i, { grade: e.target.value as Row["grade"] })
                      }
                      className="flex h-9 w-20 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="">—</option>
                      {Object.keys(GRADES).map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 text-center font-semibold text-foreground">
                    {r.grade ? GRADES[r.grade] : "—"}
                  </td>
                  <td className="p-2 text-right">
                    <button
                      onClick={() =>
                        setRows((rs) => rs.filter((_, idx) => idx !== i))
                      }
                      className="text-destructive hover:text-destructive/80"
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-md bg-muted/50 px-5 py-4">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Live Semester GPA
          </span>
          <span className="text-2xl font-bold text-primary">
            {gpa.toFixed(2)}
          </span>
        </div>

        <Button className="mt-6 w-full" size="lg">
          Save Results
        </Button>
      </div>
    </div>
  );
}
