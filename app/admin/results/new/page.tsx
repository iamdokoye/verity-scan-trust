"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  apiListStudents,
  apiListSessions,
  apiListCourses,
  apiBulkSaveResults,
  type Student,
  type AcademicSession,
  type Course,
  type Grade,
} from "@/lib/api";

const GRADES: Grade[] = ["A", "B", "C", "D", "E", "F"];
const GRADE_POINTS: Record<Grade, number> = {
  A: 5, B: 4, C: 3, D: 2, E: 1, F: 0,
};

type Row = {
  courseId: string;
  courseCode: string;
  grade: Grade | "";
};

export default function EnterResults() {
  const router = useRouter();

  // Step 1 state
  const [studentQuery, setStudentQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [showStudentDrop, setShowStudentDrop] = useState(false);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const studentSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");

  const [courses, setCourses] = useState<Course[]>([]);

  // Step 2 state
  const [rows, setRows] = useState<Row[]>([{ courseId: "", courseCode: "", grade: "" }]);

  // Submission
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Load sessions and courses on mount
  useEffect(() => {
    apiListSessions().then((s) => {
      setSessions(s);
      if (s.length > 0) setSelectedSessionId(s[0].id);
    }).catch(() => {});

    apiListCourses().then(setCourses).catch(() => {});
  }, []);

  // Debounced student search
  useEffect(() => {
    if (studentQuery.length < 2) {
      setStudents([]);
      setShowStudentDrop(false);
      return;
    }
    if (studentSearchRef.current) clearTimeout(studentSearchRef.current);
    studentSearchRef.current = setTimeout(async () => {
      setSearchingStudents(true);
      try {
        const results = await apiListStudents(studentQuery);
        setStudents(results);
        setShowStudentDrop(true);
      } catch {
        setStudents([]);
      } finally {
        setSearchingStudents(false);
      }
    }, 300);
  }, [studentQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowStudentDrop(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const courseMap = useMemo(() => {
    const m: Record<string, Course> = {};
    courses.forEach((c) => { m[c.code] = c; m[c.id] = c; });
    return m;
  }, [courses]);

  const gpa = useMemo(() => {
    const valid = rows.filter((r) => r.grade && r.courseId);
    const course = (r: Row) => courseMap[r.courseId];
    const totalUnits = valid.reduce((a, r) => a + (course(r)?.units ?? 3), 0);
    const weighted = valid.reduce(
      (a, r) => a + (course(r)?.units ?? 3) * GRADE_POINTS[r.grade as Grade],
      0
    );
    return totalUnits ? weighted / totalUnits : 0;
  }, [rows, courseMap]);

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function pickCourse(i: number, code: string) {
    const c = courseMap[code];
    if (c) {
      updateRow(i, { courseId: c.id, courseCode: c.code });
    } else {
      updateRow(i, { courseCode: code, courseId: "" });
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);

    if (!selectedStudent) { setSaveError("Select a student first."); return; }
    if (!selectedSessionId) { setSaveError("Select an academic session."); return; }

    const valid = rows.filter((r) => r.courseId && r.grade);
    if (valid.length === 0) { setSaveError("Add at least one complete course entry."); return; }

    setSaving(true);
    try {
      await apiBulkSaveResults(
        valid.map((r) => ({
          studentId: selectedStudent.id,
          sessionId: selectedSessionId,
          courseId: r.courseId,
          grade: r.grade as Grade,
        }))
      );
      setSaved(true);
      setTimeout(() => router.push(`/admin/students/${selectedStudent.id}`), 1800);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save results.");
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 py-20 text-center">
        <CheckCircle className="h-14 w-14 text-emerald-500" />
        <h2 className="text-2xl font-semibold text-foreground">Results saved!</h2>
        <p className="text-sm text-muted-foreground">
          Redirecting to student profile…
        </p>
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave}>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
        Enter Semester Results
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Select a student and session, then enter course grades.
      </p>

      {/* Step 1 */}
      <div className="mb-6 rounded-lg border border-border bg-card p-6">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-secondary">
          Step 1 — Student &amp; Session
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Student search */}
          <div className="relative" ref={dropdownRef}>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Student
            </label>
            <Input
              placeholder="Search by name or matric…"
              value={studentQuery}
              onChange={(e) => {
                setStudentQuery(e.target.value);
                setSelectedStudent(null);
              }}
              autoComplete="off"
            />
            {searchingStudents && (
              <Loader2 className="absolute right-3 top-9 h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {showStudentDrop && students.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
                {students.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setSelectedStudent(s);
                      setStudentQuery(`${s.fullName} (${s.matricNumber})`);
                      setShowStudentDrop(false);
                    }}
                  >
                    <span className="font-medium text-foreground">{s.fullName}</span>
                    <span className="font-mono text-xs text-muted-foreground">{s.matricNumber}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedStudent && (
              <p className="mt-1 text-xs text-emerald-600">
                ✓ {selectedStudent.fullName}
              </p>
            )}
          </div>

          {/* Session */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Academic Session
            </label>
            {sessions.length === 0 ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                No academic sessions found. Create one in Settings first.
              </p>
            ) : (
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} — {s.semester}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Step 2 */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Step 2 — Course Grades
            </div>
            {courses.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                No courses in the system yet. Add courses via Departments first.
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setRows((r) => [...r, { courseId: "", courseCode: "", grade: "" }])
            }
          >
            <Plus className="h-4 w-4" /> Add Course
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Course Code</th>
                <th className="hidden px-3 py-2 text-left font-medium md:table-cell">
                  Title
                </th>
                <th className="hidden px-3 py-2 text-center font-medium sm:table-cell">
                  Units
                </th>
                <th className="px-3 py-2 text-center font-medium">Grade</th>
                <th className="px-3 py-2 text-center font-medium">Pts</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const course = courseMap[r.courseId] ?? null;
                return (
                  <tr key={i} className="border-t border-border">
                    <td className="p-2">
                      <Input
                        list={`courses-${i}`}
                        placeholder="e.g. CSC401"
                        value={r.courseCode}
                        onChange={(e) => pickCourse(i, e.target.value)}
                      />
                      <datalist id={`courses-${i}`}>
                        {courses.map((c) => (
                          <option key={c.id} value={c.code}>
                            {c.title}
                          </option>
                        ))}
                      </datalist>
                      {r.courseCode && !r.courseId && (
                        <p className="mt-0.5 text-xs text-amber-600">
                          Course not found in system
                        </p>
                      )}
                    </td>
                    <td className="hidden p-2 md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {course?.title ?? "—"}
                      </span>
                    </td>
                    <td className="hidden p-2 text-center sm:table-cell">
                      <span className="text-sm text-foreground">
                        {course?.units ?? "—"}
                      </span>
                    </td>
                    <td className="p-2">
                      <select
                        value={r.grade}
                        onChange={(e) => updateRow(i, { grade: e.target.value as Grade | "" })}
                        className="flex h-9 w-20 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                      >
                        <option value="">—</option>
                        {GRADES.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 text-center font-semibold text-foreground">
                      {r.grade ? GRADE_POINTS[r.grade as Grade] : "—"}
                    </td>
                    <td className="p-2 text-right">
                      <button
                        type="button"
                        onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                        className="text-destructive hover:text-destructive/80"
                        aria-label="Remove row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-md bg-muted/50 px-5 py-4">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Live Semester GPA
          </span>
          <span className="text-2xl font-bold text-primary">{gpa.toFixed(2)}</span>
        </div>

        {saveError && (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {saveError}
          </p>
        )}

        <Button type="submit" className="mt-6 w-full" size="lg" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save Results"
          )}
        </Button>
      </div>
    </form>
  );
}
