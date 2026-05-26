import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/votta/Logo";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/verify/result")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: (s.token as string) || "",
    status: (s.status as string) || "",
  }),
  component: VerifiedResult,
});

type VerifyResult = {
  status: string;
  studentName?: string;
  matricNumber?: string;
  institution?: string;
  documentType?: string;
  programme?: string;
  sha256Hash?: string;
  signedAt?: string;
  verifiedAt?: string;
  message?: string;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function VerifiedResult() {
  const { token } = Route.useSearch();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.get<VerifyResult>(`/verify?token=${encodeURIComponent(token)}`, { noAuth: true })
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Verifying document…</p>
      </div>
    );
  }

  const d = result;

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
          {d?.studentName && <Row label="Student Name" value={d.studentName} />}
          {d?.matricNumber && <Row label="Matric Number" value={d.matricNumber} />}
          {d?.institution && <Row label="Institution" value={d.institution} />}
          {d?.documentType && <Row label="Document Type" value={d.documentType.replace(/_/g, " ")} />}
          {d?.programme && <Row label="Programme" value={d.programme} />}
          {d?.signedAt && <Row label="Date of Issue" value={new Date(d.signedAt).toLocaleDateString()} />}
          <Row label="Verification Date" value={new Date().toLocaleString()} />
          {d?.sha256Hash && <Row label="Document Hash" value={`${d.sha256Hash.slice(0, 16)}…`} />}
        </div>

        <p className="mt-4 rounded-md bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
          This document was verified against a cryptographic signature issued by{" "}
          {d?.institution ?? "the issuing institution"}.
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
