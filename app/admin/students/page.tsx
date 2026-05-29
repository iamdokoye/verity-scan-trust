"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { PageTitle } from "@/components/votta/PortalShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserPlus, Loader2 } from "lucide-react";
import { apiListStudents, type Student } from "@/lib/api";

// ── Add Student dialog (stub — expand later) ──────────────────────────────────
// For now we show a TODO notice. Full create form is a separate task.

export default function StudentsList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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

  // Initial load
  useEffect(() => {
    fetchStudents("");
  }, [fetchStudents]);

  // Debounced search
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
          <Button disabled title="Add Student — coming soon">
            <UserPlus className="h-4 w-4" /> Add Student
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Search by name or matric…"
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
                    {s.department?.name ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="hidden px-5 py-3 text-center text-foreground sm:table-cell">
                    {s.admissionYear ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/students/${s.id}`}
                      className="text-xs font-medium text-secondary hover:underline"
                    >
                      View profile →
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
    </div>
  );
}
