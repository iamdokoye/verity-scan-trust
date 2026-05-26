import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FileQuestion, FileX, RotateCcw } from "lucide-react";
import { Logo } from "@/components/votta/Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export const Route = createFileRoute("/verify/not-found")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: (s.token as string) || "",
    status: (s.status as string) || "not_found",
  }),
  component: NotFoundResult,
});

type VerifyStatus = "verified" | "tampered" | "invalid_signature" | "superseded" | "revoked" | "not_found";

function statusToRoute(status: VerifyStatus): "/verify/result" | "/verify/tampered" | "/verify/not-found" {
  if (status === "verified") return "/verify/result";
  if (status === "tampered" || status === "invalid_signature") return "/verify/tampered";
  return "/verify/not-found";
}

function NotFoundResult() {
  const { token, status } = Route.useSearch();
  const [value, setValue] = useState(token || "");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleRetry() {
    const t = value.trim();
    if (!t) return;
    setLoading(true);
    try {
      const result = await api.get<{ status: VerifyStatus }>(`/verify?token=${encodeURIComponent(t)}`, { noAuth: true });
      navigate({ to: statusToRoute(result.status), search: { token: t, status: result.status } });
    } catch {
      navigate({ to: "/verify/not-found", search: { token: t } });
    } finally {
      setLoading(false);
    }
  }

  const isSuperseded = status === "superseded";
  const isRevoked = status === "revoked";

  const Icon = isRevoked ? FileX : isSuperseded ? RotateCcw : FileQuestion;
  const heading = isRevoked
    ? "Document Revoked"
    : isSuperseded
      ? "Document Superseded"
      : "No Record Found.";
  const description = isRevoked
    ? "This document has been revoked by the issuing institution. Do not accept it."
    : isSuperseded
      ? "This document has been superseded by a corrected version. Please request the updated document."
      : "The token you entered does not match any document in our system. Please check the token and try again.";

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

      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">{heading}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>

        {!isRevoked && !isSuperseded && (
          <div className="mx-auto mt-8 max-w-md text-left">
            <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
              Verification token
            </label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="font-mono"
              placeholder="Enter token to retry"
            />
            <Button
              className="mt-4 w-full"
              onClick={handleRetry}
              disabled={loading || !value.trim()}
            >
              {loading ? "Checking…" : "Try again"}
            </Button>
          </div>
        )}

        <p className="mx-auto mt-8 max-w-md text-xs text-muted-foreground">
          If you received this link from a student, ask them to share it again from their Votta portal.
        </p>
      </main>
    </div>
  );
}
