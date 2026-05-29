"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Download,
  QrCode,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  apiGetStudent,
  apiGetStudentDocuments,
  apiGetStudentResults,
  apiGetDocumentDownloadUrl,
  type AcademicSummary,
  type StudentDetail,
  type VottaDocument,
} from "@/lib/api";

const TABS = ["Overview", "Results", "Documents"] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  pending_approval:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  approved:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  superseded: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  revoked: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function DocTypeLabel({ type }: { type: string }) {
  const MAP: Record<string, string> = {
    degree_certificate: "Degree Certificate",
    transcript: "Transcript",
    other: "Other",
  };
  return <>{MAP[type] ?? type}</>;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StudentProfile({
  params,
}: {
  params: Promise<{ matric: string }>;
}) {
  // "matric" param is actually the student UUID (route named before IDs were used)
  const { matric: studentId } = use(params);
  const router = useRouter();

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [studentError, setStudentError] = useState<string | null>(null);

  const [docs, setDocs] = useState<VottaDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [results, setResults] = useState<AcademicSummary | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [expandedHash, setExpandedHash] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<Record<number, boolean>>({ 0: true });

  useEffect(() => {
    async function load() {
      setLoadingStudent(true);
      try {
        const s = await apiGetStudent(studentId);
        setStudent(s);
      } catch (err: unknown) {
        setStudentError(
          err instanceof Error ? err.message : "Student not found."
        );
      } finally {
        setLoadingStudent(false);
      }
    }
    load();
  }, [studentId]);

  useEffect(() => {
    if (tab !== "Documents" || !student) return;
    setLoadingDocs(true);
    apiGetStudentDocuments(studentId)
      .then(setDocs)
      .catch(() => setDocs([]))
      .finally(() => setLoadingDocs(false));
  }, [tab, student, studentId]);

  useEffect(() => {
    if (tab !== "Results" || !student) return;
    setLoadingResults(true);
    apiGetStudentResults(studentId)
      .then(setResults)
      .catch(() => setResults(null))
      .finally(() => setLoadingResults(false));
  }, [tab, student, studentId]);

  async function handleDownload(doc: VottaDocument) {
    try {
      const { url } = await apiGetDocumentDownloadUrl(doc.id);
      window.open(url, "_blank");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not get download URL.");
    }
  }

  // Loading / error states
  if (loadingStudent) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (studentError || !student) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-sm text-destructive">{studentError ?? "Student not found."}</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to students
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to students
      </button>

      {/* Profile header */}
      <div className="mb-6 flex flex-col gap-5 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
          {initials(student.fullName)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">
            {student.fullName}
          </h1>
          <div className="mt-0.5 font-mono text-sm text-muted-foreground">
            {student.matricNumber}
          </div>
          {student.department && (
            <div className="mt-1 text-sm text-foreground">
              {student.department.name}
            </div>
          )}
          {student.admissionYear && (
            <div className="text-xs text-muted-foreground">
              Admitted {student.admissionYear}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          {student.cgpa != null && (
            <>
              <div className="text-3xl font-bold text-primary">
                {student.cgpa.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">CGPA</div>
              {student.degreeClass && (
                <div className="mt-1 text-sm font-medium text-foreground">
                  {student.degreeClass}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
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

      {/* Overview */}
      {tab === "Overview" && (
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {(
              [
                ["Full Name", student.fullName],
                ["Matric No.", student.matricNumber],
                ["Email", student.email ?? "—"],
                ["Department", student.department?.name ?? "—"],
                ["Admission Year", student.admissionYear != null ? String(student.admissionYear) : "—"],
                ["Graduation Year", student.graduationYear != null ? String(student.graduationYear) : "—"],
                ["CGPA", student.cgpa != null ? student.cgpa.toFixed(2) : "—"],
                ["Degree Class", student.degreeClass ?? "—"],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k} className="border-b border-border pb-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {k}
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {tab === "Results" && (
        <div>
          {loadingResults ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !results || results.sessions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-base font-medium text-foreground">
                No results recorded yet
              </p>
              <p className="text-sm text-muted-foreground">
                Enter results from the Results page.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.sessions.map((session, index) => {
                const isOpen = !!expandedSession[index];
                return (
                  <div
                    key={`${session.sessionLabel}-${session.semester}`}
                    className="overflow-hidden rounded-lg border border-border bg-card"
                  >
                    <button
                      onClick={() =>
                        setExpandedSession((current) => ({
                          ...current,
                          [index]: !isOpen,
                        }))
                      }
                      className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/40"
                    >
                      <span className="text-sm font-semibold text-foreground">
                        {session.sessionLabel} - {session.semester} semester
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          GPA
                        </span>
                        <span className="text-base font-semibold text-primary">
                          {session.gpa.toFixed(2)}
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
                              <th className="px-5 py-2 text-left font-medium">Code</th>
                              <th className="px-5 py-2 text-left font-medium">Title</th>
                              <th className="px-5 py-2 text-center font-medium">Units</th>
                              <th className="px-5 py-2 text-center font-medium">Grade</th>
                              <th className="px-5 py-2 text-center font-medium">Point</th>
                            </tr>
                          </thead>
                          <tbody>
                            {session.results.map((result, resultIndex) => (
                              <tr
                                key={result.id}
                                className={
                                  resultIndex % 2 === 0 ? "bg-background" : "bg-muted/30"
                                }
                              >
                                <td className="px-5 py-2.5 font-mono text-foreground">
                                  {result.course.code}
                                </td>
                                <td className="px-5 py-2.5 text-foreground">
                                  {result.course.title}
                                </td>
                                <td className="px-5 py-2.5 text-center text-foreground">
                                  {result.course.creditUnits}
                                </td>
                                <td className="px-5 py-2.5 text-center font-semibold text-foreground">
                                  {result.grade}
                                </td>
                                <td className="px-5 py-2.5 text-center text-foreground">
                                  {result.gradePoint}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Documents */}
      {tab === "Documents" && (
        <div>
          {loadingDocs ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-base font-medium text-foreground">
                No documents uploaded yet
              </p>
              <p className="text-sm text-muted-foreground">
                Upload a document from the Documents page.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Type</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                    <th className="hidden px-5 py-3 text-left font-medium lg:table-cell">
                      File
                    </th>
                    <th className="hidden px-5 py-3 text-left font-medium lg:table-cell">
                      Hash (SHA-256)
                    </th>
                    <th className="px-5 py-3 text-left font-medium">Uploaded</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {docs.map((d) => (
                    <tr key={d.id}>
                      <td className="px-5 py-3 font-medium text-foreground">
                        <DocTypeLabel type={d.documentType} />
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="hidden px-5 py-3 lg:table-cell">
                        <div className="max-w-[160px] truncate text-foreground">
                          {d.fileName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(d.fileSizeBytes / 1024).toFixed(0)} KB
                        </div>
                      </td>
                      <td className="hidden px-5 py-3 lg:table-cell">
                        {d.sha256Hash ? (
                          <button
                            className="font-mono text-xs text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setExpandedHash(
                                expandedHash === d.id ? null : d.id
                              )
                            }
                          >
                            {expandedHash === d.id
                              ? d.sha256Hash
                              : `${d.sha256Hash.slice(0, 16)}…`}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          {d.verificationToken && (
                            <Button variant="outline" size="sm">
                              <QrCode className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(d)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
