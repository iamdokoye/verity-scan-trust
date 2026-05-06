import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Logo } from "@/components/votta/Logo";

export const Route = createFileRoute("/verify/tampered")({
  component: Tampered,
});

function Tampered() {
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
            <div className="text-sm text-destructive-foreground/90">
              The document does not match the original record.
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="mb-6 text-sm leading-relaxed text-foreground">
          The document presented does not match the original record. The content may have been altered
          after issuance. <span className="font-semibold">Do not accept this document.</span>
        </p>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex flex-col gap-1 border-b border-border py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Document Type</span>
            <span className="text-sm font-medium text-foreground">Degree Certificate</span>
          </div>
          <div className="flex flex-col gap-1 border-b border-border py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Verification Token</span>
            <span className="font-mono text-sm text-foreground">VTA-7K3M-9P2Q-XR4N</span>
          </div>
          <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Status</span>
            <span className="inline-flex w-fit items-center rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-destructive">
              Tampered
            </span>
          </div>
        </div>

        <div className="mt-6 rounded-md border border-warning/40 bg-warning/15 p-4 text-sm text-foreground">
          If you believe this is an error, contact{" "}
          <a className="font-medium text-secondary hover:underline" href="mailto:registrar@unilag.edu.ng">
            registrar@unilag.edu.ng
          </a>
          .
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
