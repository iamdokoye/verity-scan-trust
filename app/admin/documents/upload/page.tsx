"use client";

import { useState } from "react";
import { Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { studentList } from "@/lib/mock-data";

const TYPES = ["Degree Certificate", "Transcript", "Other"] as const;

export default function UploadDoc() {
  const [type, setType] = useState<(typeof TYPES)[number]>("Degree Certificate");
  const [file, setFile] = useState<File | null>(null);
  const [studentQuery, setStudentQuery] = useState("");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
        Upload and Secure Document
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Upload, hash and digitally sign a student document.
      </p>

      <div className="space-y-6 rounded-lg border border-border bg-card p-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Student
          </label>
          <Input
            placeholder="Search by name or matric number…"
            value={studentQuery}
            onChange={(e) => setStudentQuery(e.target.value)}
            list="students"
          />
          <datalist id="students">
            {studentList.map((s) => (
              <option key={s.matric} value={`${s.name} (${s.matric})`} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Document Type
          </label>
          <div className="flex flex-wrap gap-4">
            {TYPES.map((t) => (
              <label
                key={t}
                className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
              >
                <input
                  type="radio"
                  name="docType"
                  checked={type === t}
                  onChange={() => setType(t)}
                  className="h-4 w-4 accent-primary"
                />
                {t}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            File
          </label>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/40 p-10 text-center transition-colors hover:bg-muted">
            <Upload className="h-9 w-9 text-muted-foreground" />
            <div className="mt-3 text-sm font-medium text-foreground">
              Drag and drop a PDF or image here, or click to browse.
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Max file size: 5MB
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
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
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
          </div>
        )}

        <div>
          <Button className="w-full" size="lg">
            Upload and Sign
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Once uploaded, this document will be cryptographically hashed and
            signed with the institution&apos;s private key. The process is
            automatic and takes less than 3 seconds.
          </p>
        </div>
      </div>
    </div>
  );
}
