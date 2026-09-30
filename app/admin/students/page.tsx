"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Search, UserPlus, UserRoundSearch } from "lucide-react";
import { PageTitle } from "@/components/votta/PortalShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/votta/GlassCard";
import { Input } from "@/components/ui/input";
import {
  apiCreateStudent,
  apiListDepartments,
  apiListFaculties,
  apiListStudents,
  type Department,
  type Faculty,
  type Student,
} from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function optionalNumber(value: string) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : undefined;
}

function AddStudentDialog({
  open,
  onOpenChange,
  faculties,
  departments,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faculties: Faculty[];
  departments: Department[];
  onCreated: () => Promise<void>;
}) {
  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [programme, setProgramme] = useState("");
  const [admissionYear, setAdmissionYear] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableDepartments = useMemo(
    () => departments.filter((department) => department.facultyId === facultyId),
    [departments, facultyId]
  );

  useEffect(() => {
    if (!open) return;
    if (!facultyId && faculties.length > 0) {
      setFacultyId(faculties[0].id);
    }
  }, [faculties, facultyId, open]);

  useEffect(() => {
    if (!open) return;
    const stillValid = availableDepartments.some(
      (department) => department.id === departmentId
    );
    if (availableDepartments.length > 0 && !stillValid) {
      setDepartmentId(availableDepartments[0].id);
    }
    if (availableDepartments.length === 0) {
      setDepartmentId("");
    }
  }, [availableDepartments, departmentId, open]);

  function reset() {
    const firstFacultyId = faculties[0]?.id ?? "";
    setFacultyId(firstFacultyId);
    setDepartmentId(
      departments.find((department) => department.facultyId === firstFacultyId)?.id ?? ""
    );
    setMatricNumber("");
    setFullName("");
    setProgramme("");
    setAdmissionYear("");
    setGraduationYear("");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiCreateStudent({
        matricNumber: matricNumber.trim(),
        fullName: fullName.trim(),
        departmentId,
        programme: programme.trim() || undefined,
        admissionYear: optionalNumber(admissionYear),
        graduationYear: optionalNumber(graduationYear),
      });
      await onCreated();
      reset();
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create student.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Student</DialogTitle>
          <DialogDescription>
            Create a student under a faculty and department.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Matric Number
              </label>
              <Input
                value={matricNumber}
                onChange={(event) => setMatricNumber(event.target.value)}
                placeholder="CSC/2026/001"
                required
                minLength={3}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Full Name
              </label>
              <Input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ada Okafor"
                required
                minLength={2}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Faculty
              </label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={facultyId}
                onChange={(event) => setFacultyId(event.target.value)}
                required
                disabled={faculties.length === 0}
              >
                {faculties.length === 0 ? (
                  <option value="">Create a faculty first</option>
                ) : (
                  faculties.map((faculty) => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Department
              </label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
                required
                disabled={availableDepartments.length === 0}
              >
                {availableDepartments.length === 0 ? (
                  <option value="">Create a department first</option>
                ) : (
                  availableDepartments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              Programme
            </label>
            <Input
              value={programme}
              onChange={(event) => setProgramme(event.target.value)}
              placeholder="B.Sc. Computer Science"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Admission Year
              </label>
              <Input
                value={admissionYear}
                onChange={(event) => setAdmissionYear(event.target.value)}
                inputMode="numeric"
                placeholder="2022"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Graduation Year
              </label>
              <Input
                value={graduationYear}
                onChange={(event) => setGraduationYear(event.target.value)}
                inputMode="numeric"
                placeholder="2026"
              />
            </div>
          </div>

          {faculties.length === 0 && (
            <p className="rounded-md bg-warning/15 px-3 py-2 text-xs text-foreground">
              Add at least one faculty before creating students.
            </p>
          )}
          {faculties.length > 0 && availableDepartments.length === 0 && (
            <p className="rounded-md bg-warning/15 px-3 py-2 text-xs text-foreground">
              Add a department under the selected faculty before creating students.
            </p>
          )}
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || availableDepartments.length === 0}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create Student
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function StudentsList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStudents = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      setStudents(await apiListStudents(q || undefined));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAcademicStructure = useCallback(async () => {
    const [facultyItems, departmentItems] = await Promise.all([
      apiListFaculties(),
      apiListDepartments(),
    ]);
    setFaculties(facultyItems);
    setDepartments(departmentItems);
  }, []);

  useEffect(() => {
    fetchStudents("");
    loadAcademicStructure().catch(() => {
      setFaculties([]);
      setDepartments([]);
    });
  }, [fetchStudents, loadAcademicStructure]);

  function handleSearch(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchStudents(value), 350);
  }

  return (
    <div>
      <PageTitle
        title="Students"
        action={
          <Button variant="hero" onClick={() => setAddOpen(true)}>
            <UserPlus strokeWidth={1.75} /> Add student
          </Button>
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-4 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or matric..."
          aria-label="Search students"
          className="h-12 pl-11"
          value={query}
          onChange={(event) => handleSearch(event.target.value)}
        />
      </div>

      {loading ? (
        <GlassCard className="divide-y divide-border/60" aria-busy="true" aria-label="Loading students">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </GlassCard>
      ) : error ? (
        <GlassCard className="border-destructive/30 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="glass" size="sm" className="mt-4" onClick={() => fetchStudents(query)}>
            Retry
          </Button>
        </GlassCard>
      ) : students.length === 0 ? (
        <GlassCard glossy className="grid place-items-center px-6 py-14 text-center">
          <span
            className="grid h-14 w-14 place-items-center rounded-2xl text-white"
            style={{ background: "var(--gradient-primary)" }}
          >
            <UserRoundSearch className="h-7 w-7" strokeWidth={1.75} />
          </span>
          <h2 className="mt-4 text-lg font-bold">
            {query ? `No students match "${query}"` : "No students yet"}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {query
              ? "Try a different spelling or matric number."
              : "Students will appear here once they are added."}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {query && (
              <Button variant="glass" onClick={() => handleSearch("")}>
                Clear search
              </Button>
            )}
            <Button variant="hero" onClick={() => setAddOpen(true)}>
              <UserPlus strokeWidth={1.75} /> Add student
            </Button>
          </div>
        </GlassCard>
      ) : (
        <>
          <GlassCard className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <tr className="border-b border-border/60">
                    <th className="px-5 py-3 font-medium">Matric No.</th>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Faculty</th>
                    <th className="px-5 py-3 font-medium">Department</th>
                    <th className="hidden px-5 py-3 font-medium lg:table-cell">Programme</th>
                    <th className="px-5 py-3 text-center font-medium">Adm. Year</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b border-border/40 transition-colors last:border-0 hover:bg-secondary/50"
                    >
                      <td className="tabular px-5 py-3.5 font-mono">{student.matricNumber}</td>
                      <td className="px-5 py-3.5 font-semibold">{student.fullName}</td>
                      <td className="px-5 py-3.5">{student.department?.faculty?.name ?? "-"}</td>
                      <td className="px-5 py-3.5">{student.department?.name ?? "-"}</td>
                      <td className="hidden px-5 py-3.5 lg:table-cell">{student.programme ?? "-"}</td>
                      <td className="tabular px-5 py-3.5 text-center">{student.admissionYear ?? "-"}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className="text-xs font-semibold whitespace-nowrap text-accent hover:underline"
                        >
                          View profile
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          <ul className="grid gap-3 md:hidden">
            {students.map((student) => (
              <li key={student.id}>
                <GlassCard className="p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{student.fullName}</p>
                      <p className="tabular font-mono text-xs text-muted-foreground">
                        {student.matricNumber}
                      </p>
                    </div>
                    <Link
                      href={`/admin/students/${student.id}`}
                      className="glass-subtle inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-semibold text-accent"
                    >
                      View profile
                    </Link>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {[student.department?.name, student.programme].filter(Boolean).join(" · ") || "-"}
                  </p>
                </GlassCard>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            {students.length} student{students.length !== 1 ? "s" : ""}
            {query && ` matching "${query}"`}
          </p>
        </>
      )}

      <AddStudentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        faculties={faculties}
        departments={departments}
        onCreated={async () => {
          await fetchStudents(query);
        }}
      />
    </div>
  );
}
