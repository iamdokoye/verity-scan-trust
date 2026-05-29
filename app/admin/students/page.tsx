"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, UserPlus } from "lucide-react";
import { PageTitle } from "@/components/votta/PortalShell";
import { Button } from "@/components/ui/button";
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
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" /> Add Student
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Search by name or matric..."
          value={query}
          onChange={(event) => handleSearch(event.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => fetchStudents(query)}
          >
            Retry
          </Button>
        </div>
      ) : students.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="text-base font-medium text-foreground">
            {query ? `No students match "${query}"` : "No students yet"}
          </p>
          <p className="text-sm text-muted-foreground">
            {query
              ? "Try a different search term."
              : "Students will appear here once they are added."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Matric No.</th>
                <th className="px-5 py-3 text-left font-medium">Name</th>
                <th className="hidden px-5 py-3 text-left font-medium md:table-cell">
                  Faculty
                </th>
                <th className="hidden px-5 py-3 text-left font-medium md:table-cell">
                  Department
                </th>
                <th className="hidden px-5 py-3 text-left font-medium lg:table-cell">
                  Programme
                </th>
                <th className="hidden px-5 py-3 text-center font-medium sm:table-cell">
                  Adm. Year
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-muted/30">
                  <td className="px-5 py-3 font-mono text-foreground">
                    {student.matricNumber}
                  </td>
                  <td className="px-5 py-3 font-medium text-foreground">
                    {student.fullName}
                  </td>
                  <td className="hidden px-5 py-3 text-foreground md:table-cell">
                    {student.department?.faculty?.name ?? "-"}
                  </td>
                  <td className="hidden px-5 py-3 text-foreground md:table-cell">
                    {student.department?.name ?? "-"}
                  </td>
                  <td className="hidden px-5 py-3 text-foreground lg:table-cell">
                    {student.programme ?? "-"}
                  </td>
                  <td className="hidden px-5 py-3 text-center text-foreground sm:table-cell">
                    {student.admissionYear ?? "-"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/students/${student.id}`}
                      className="text-xs font-medium text-secondary hover:underline"
                    >
                      View profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            {students.length} student{students.length !== 1 ? "s" : ""}
            {query && ` matching "${query}"`}
          </div>
        </div>
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
