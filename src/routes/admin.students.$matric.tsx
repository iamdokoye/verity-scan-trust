import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, Plus, Download, QrCode } from "lucide-react";
import { student, semesters, documents, studentList } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/students/$matric")({
  component: StudentProfile,
});

const TABS = ["Overview", "Results", "Documents"] as const;

function StudentProfile() {
  const { matric } = Route.useParams();
  const found = studentList.find((s) => s.matric === matric);
  const display = found
    ? { ...student, fullName: found.name, matric: found.matric, department: `Department of ${found.dept}`, admissionYear: found.year, cgpa: found.cgpa }
    : student;

  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-5 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
          {display.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">{display.fullName}</h1>
          <div className="mt-0.5 font-mono text-sm text-muted-foreground">{display.matric}</div>
          <div className="mt-1 text-sm text-foreground">
            {display.department} · {display.programme}
          </div>
          <div className="text-xs text-muted-foreground">Admitted {display.admissionYear}</div>
        </div>
      </div>

      <div className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {[
              ["Name", display.fullName],
              ["Matric No.", display.matric],
              ["Department", display.department.replace("Department of ", "")],
              ["Programme", display.programme],
              ["Admission Year", String(display.admissionYear)],
              ["Graduation Year", String(student.graduationYear)],
              ["CGPA", display.cgpa.toFixed(2)],
              ["Degree Class", student.degreeClass],
            ].map(([k, v]) => (
              <div key={k} className="border-b border-border pb-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{k}</div>
                <div className="mt-1 text-sm font-medium text-foreground">{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "Results" && (
        <div>
          <div className="mb-4 flex justify-end">
            <Button><Plus className="h-4 w-4" /> Add Result</Button>
          </div>
          <div className="space-y-3">
            {semesters.map((s, i) => {
              const isOpen = !!open[i];
              return (
                <div key={i} className="overflow-hidden rounded-lg border border-border bg-card">
                  <button
                    onClick={() => setOpen((o) => ({ ...o, [i]: !isOpen }))}
                    className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/40"
                  >
                    <span className="text-sm font-semibold text-foreground">{s.label}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">GPA</span>
                      <span className="text-base font-semibold text-primary">{s.gpa.toFixed(2)}</span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </span>
                  </button>
                  {isOpen && (
                    <table className="w-full border-t border-border text-sm">
                      <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-5 py-2 text-left font-medium">Code</th>
                          <th className="px-5 py-2 text-left font-medium">Title</th>
                          <th className="px-5 py-2 text-center font-medium">Units</th>
                          <th className="px-5 py-2 text-center font-medium">Grade</th>
                          <th className="px-5 py-2 text-center font-medium">Point</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.courses.map((c, idx) => (
                          <tr key={c.code} className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                            <td className="px-5 py-2.5 font-mono">{c.code}</td>
                            <td className="px-5 py-2.5">{c.title}</td>
                            <td className="px-5 py-2.5 text-center">{c.units}</td>
                            <td className="px-5 py-2.5 text-center font-semibold">{c.grade}</td>
                            <td className="px-5 py-2.5 text-center">{c.point}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "Documents" && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Document Type</th>
                <th className="px-5 py-3 text-left font-medium">Upload Date</th>
                <th className="px-5 py-3 text-left font-medium">Hash</th>
                <th className="px-5 py-3 text-left font-medium">Signature</th>
                <th className="px-5 py-3 text-left font-medium">Token</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {documents.map((d) => (
                <tr key={d.id}>
                  <td className="px-5 py-3 font-medium text-foreground">{d.type}</td>
                  <td className="px-5 py-3 text-foreground">{d.date}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{d.hash}…</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-success">
                      Valid
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{d.token.slice(0, 12)}…</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm"><QrCode className="h-4 w-4" /> QR</Button>
                      <Button variant="outline" size="sm"><Download className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
