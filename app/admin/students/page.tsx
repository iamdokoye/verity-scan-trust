"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { PageTitle } from "@/components/votta/PortalShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserPlus, Loader2 } from "lucide-react";
import {
  apiCreateStudent,
  apiListDepartments,
  apiListStudents,
  type Department,
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

function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : undefined;
}

function AddStudentDialog({
  open,
  onOpenChange,
  departments,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
  onCreated: () => Promise<void>;
}) {
  const [matricNumber, setMatricNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [programme, setProgramme] = useState("");
  const [admissionYear, setAdmissionYear] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !departmentId && departments.length > 0) {
      setDepartmentId(departments[0].id);
    }
  }, [departmentId, departments, open]);

  function reset() {
    setMatricNumber("");
    setFullName("");
    setDepartmentId(departments[0]?.id ?? "");
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
        admissionYear: toOptionalNumber(admissionYear),
        graduationYear: toOptionalNumber(graduationYear),
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
            Create a student record for this institution.
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
                Department
              </label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
                required
                disabled={departments.length === 0}
              >
                {departments.length === 0 ? (
                  <option value="">Create a department first</option>
                ) : (
                  departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Faculty / Programme
              </label>
              <Input
                value={programme}
                onChange={(event) => setProgramme(event.target.value)}
                placeholder="Faculty of Science"
              />
            </div>
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

          {departments.length === 0 && (
            <p className="rounded-md bg-warning/15 px-3 py-2 text-xs text-foreground">
              Add at least one department before creating a student.
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
              disabled={submitting || departments.length === 0}
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
      const results = await apiListStudents(q || undefined);
      setStudents(results);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    try {
      setDepartments(await apiListDepartments());
    } catch {
      setDepartments([]);
    }
  }, []);

  useEffect(() => {
    fetchStudents("");
    loadDepartments();
  }, [fetchStudents, loadDepartments]);

  function handleSearch(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchStudents(value);
    }, 350);
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
          onChange={(e) => handleSearch(e.target.value)}
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
              : "Students will appear here once they sign up or are added."}
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
                  Department
                </th>
                <th className="hidden px-5 py-3 text-left font-medium lg:table-cell">
                  Faculty / Programme
                </th>
                <th className="hidden px-5 py-3 text-center font-medium sm:table-cell">
                  Adm. Year
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-5 py-3 font-mono text-foreground">
                    {s.matricNumber}
                  </td>
                  <td className="px-5 py-3 font-medium text-foreground">
                    {s.fullName}
                  </td>
                  <td className="hidden px-5 py-3 text-foreground md:table-cell">
                    {s.department?.name ?? <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="hidden px-5 py-3 text-foreground lg:table-cell">
                    {s.programme ?? <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="hidden px-5 py-3 text-center text-foreground sm:table-cell">
                    {s.admissionYear ?? "-"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/students/${s.id}`}
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
        departments={departments}
        onCreated={async () => {
          await fetchStudents(query);
        }}
      />
    </div>
  );
}
