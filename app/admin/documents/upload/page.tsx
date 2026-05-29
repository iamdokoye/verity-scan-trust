"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  apiListStudents,
  apiUploadDocument,
  type Student,
  type DocumentType,
} from "@/lib/api";

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: "degree_certificate", label: "Degree Certificate" },
  { value: "transcript", label: "Transcript" },
  { value: "other", label: "Other" },
];

const DEGREE_CLASSES = [
  "First Class",
  "Second Class Upper",
  "Second Class Lower",
  "Third Class",
  "Pass",
];

export default function UploadDoc() {
  const router = useRouter();

  // Student search
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form fields
  const [docType, setDocType] = useState<DocumentType>("degree_certificate");
  const [degreeClass, setDegreeClass] = useState("");
  const [programme, setProgramme] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Debounced student search
  useEffect(() => {
    if (query.length < 2) {
      setStudents([]);
      setShowDropdown(false);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await apiListStudents(query);
        setStudents(results);
        setShowDropdown(true);
      } catch {
        setStudents([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectStudent(s: Student) {
    setSelectedStudent(s);
    setQuery(`${s.fullName} (${s.matricNumber})`);
    setShowDropdown(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUploadError(null);

    if (!selectedStudent) {
      setUploadError("Please select a student.");
      return;
    }
    if (!file) {
      setUploadError("Please choose a file to upload.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", docType);
      if (degreeClass) formData.append("declaredDegreeClass", degreeClass);
      if (programme) formData.append("declaredProgramme", programme);
      if (gradYear) formData.append("declaredGraduationYear", gradYear);

      await apiUploadDocument(selectedStudent.id, formData);
      setUploadSuccess(true);

      // Redirect to documents list after 2 seconds
      setTimeout(() => router.push("/admin/documents"), 2000);
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error ? err.message : "Upload failed. Please try again."
      );
      setSubmitting(false);
    }
  }

  if (uploadSuccess) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 py-20 text-center">
        <CheckCircle className="h-14 w-14 text-emerald-500" />
        <h2 className="text-2xl font-semibold text-foreground">
          Document uploaded &amp; signed
        </h2>
        <p className="text-sm text-muted-foreground">
          The document has been hashed and digitally signed with the institution
          key. Redirecting to documents list…
        </p>
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
        Upload and Secure Document
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Upload, hash and digitally sign a student document.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-border bg-card p-6">
        {/* Student picker */}
        <div className="relative" ref={dropdownRef}>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Student <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="Search by name or matric number…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedStudent(null);
            }}
            autoComplete="off"
          />
          {searchLoading && (
            <Loader2 className="absolute right-3 top-9 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {showDropdown && students.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
              {students.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-muted"
                  onClick={() => selectStudent(s)}
                >
                  <span className="font-medium text-foreground">{s.fullName}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {s.matricNumber}
                  </span>
                </button>
              ))}
            </div>
          )}
          {showDropdown && students.length === 0 && !searchLoading && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-lg">
              No students found for &quot;{query}&quot;
            </div>
          )}
          {selectedStudent && (
            <p className="mt-1.5 text-xs text-emerald-600">
              ✓ {selectedStudent.fullName} &bull; {selectedStudent.matricNumber}
              {selectedStudent.department && ` · ${selectedStudent.department.name}`}
            </p>
          )}
        </div>

        {/* Document type */}
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Document Type <span className="text-destructive">*</span>
          </label>
          <div className="flex flex-wrap gap-4">
            {DOC_TYPES.map((t) => (
              <label
                key={t.value}
                className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
              >
                <input
                  type="radio"
                  name="docType"
                  checked={docType === t.value}
                  onChange={() => setDocType(t.value)}
                  className="h-4 w-4 accent-primary"
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>

        {/* Optional metadata — shown for degree_certificate */}
        {docType === "degree_certificate" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Degree Class (optional)
              </label>
              <select
                value={degreeClass}
                onChange={(e) => setDegreeClass(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">— Select —</option>
                {DEGREE_CLASSES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Graduation Year (optional)
              </label>
              <Input
                type="number"
                placeholder="e.g. 2023"
                min={1960}
                max={2100}
                value={gradYear}
                onChange={(e) => setGradYear(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Programme / Course (optional)
              </label>
              <Input
                placeholder="e.g. B.Sc. Computer Science"
                value={programme}
                onChange={(e) => setProgramme(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* File drop zone */}
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            File <span className="text-destructive">*</span>
          </label>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/40 p-10 text-center transition-colors hover:bg-muted">
            <Upload className="h-9 w-9 text-muted-foreground" />
            <div className="mt-3 text-sm font-medium text-foreground">
              Drag and drop a PDF or image here, or click to browse.
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Accepted: PDF, PNG, JPG · Max 5 MB
            </div>
            <input
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {file && (
          <div className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">
                {file.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="text-muted-foreground hover:text-destructive"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        )}

        {uploadError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {uploadError}
          </p>
        )}

        <div>
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading and signing…
              </>
            ) : (
              "Upload and Sign"
            )}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Once uploaded, this document will be cryptographically hashed and
            signed with the institution&apos;s private key.
          </p>
        </div>
      </form>
    </div>
  );
}
