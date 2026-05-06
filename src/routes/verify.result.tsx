import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/votta/Logo";
import { verifiedDocument, INSTITUTION } from "@/lib/mock-data";

export const Route = createFileRoute("/verify/result")({
  component: VerifiedResult,
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function VerifiedResult() {
  const d = verifiedDocument;
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo />
          <Link to="/" className="text-xs text-secondary hover:underline">
            Verify another document
          </Link>
        </div>
      </header>

      <div className="bg-success px-4 py-6 text-success-foreground">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <CheckCircle2 className="h-9 w-9" strokeWidth={2.5} />
          <div>
            <div className="text-xl font-bold">Document Verified</div>
            <div className="text-sm text-success-foreground/90">
              Cryptographic signature is valid.
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-lg border border-border bg-card p-6">
          <Row label="Student Name" value={d.studentName} />
          <Row label="Matric Number" value={d.matricNumber} />
          <Row label="Institution" value={d.institution} />
          <Row label="Document Type" value={d.documentType} />
          <Row label="Programme" value={d.programme} />
          <Row label="Date of Issue" value={d.dateOfIssue} />
          <Row label="Issued By" value={d.issuedBy} />
          <Row label="Verification Date" value={new Date().toLocaleString()} />
          <Row label="Document Hash" value={`${d.hash}…`} />
        </div>

        <p className="mt-4 rounded-md bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
          This document was verified against a cryptographic signature issued by {INSTITUTION}.
          The document content has not been altered since it was signed.
        </p>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-secondary hover:underline">
            Verify another document
          </Link>
        </div>
      </main>
    </div>
  );
}
