import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Logo } from "@/components/votta/Logo";

export const Route = createFileRoute("/verify/tampered")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: (s.token as string) || "",
    status: (s.status as string) || "tampered",
  }),
  component: Tampered,
});

function Tampered() {
  const { token, status } = Route.useSearch();

  const label = status === "invalid_signature" ? "Invalid Signature" : "Tampered";
  const description =
    status === "invalid_signature"
      ? "The digital signature on this document could not be verified."
      : "The document does not match the original record.";

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

      <div className="bg-destructive px-4 py-6 text-destructive-foreground">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <AlertTriangle className="h-9 w-9" strokeWidth={2.5} />
          <div>
            <div className="text-xl font-bold">Document Integrity Compromised</div>
            <div className="text-sm text-destructive-foreground/90">{description}</div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="mb-6 text-sm leading-relaxed text-foreground">
          The document presented does not match the original record. The content may have been altered
          after issuance. <span className="font-semibold">Do not accept this document.</span>
        </p>

        <div className="rounded-lg border border-border bg-card p-6">
          {token && (
            <div className="flex flex-col gap-1 border-b border-border py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Verification Token</span>
              <span className="font-mono text-sm text-foreground">{token}</span>
            </div>
          )}
          <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Status</span>
            <span className="inline-flex w-fit items-center rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-destructive">
              {label}
            </span>
          </div>
        </div>

        <div className="mt-6 rounded-md border border-warning/40 bg-warning/15 p-4 text-sm text-foreground">
          If you believe this is an error, contact the issuing institution directly to verify the document's authenticity.
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-secondary hover:underline">
            Verify another document
          </Link>
        </div>
      </main>
    </div>
  );
}
