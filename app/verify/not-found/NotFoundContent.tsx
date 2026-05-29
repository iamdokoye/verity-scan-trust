"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { FileQuestion, FileX, RotateCcw } from "lucide-react";
import { Logo } from "@/components/votta/Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type VerifyStatus =
  | "verified"
  | "tampered"
  | "invalid_signature"
  | "superseded"
  | "revoked"
  | "not_found";

type VerifyResponse = {
  status: VerifyStatus;
  reason?: string | null;
};

function statusToPath(
  status: VerifyStatus
): "/verify/result" | "/verify/tampered" | "/verify/not-found" {
  if (status === "verified") return "/verify/result";
  if (status === "tampered" || status === "invalid_signature")
    return "/verify/tampered";
  return "/verify/not-found";
}

export function NotFoundContent() {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") ?? "";
  const status = searchParams.get("status") ?? "not_found";
  const reason = searchParams.get("reason");
  const [value, setValue] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRetry() {
    const t = value.trim();
    if (!t) return;
    setLoading(true);
    try {
      const result = await api.get<VerifyResponse>(
        `/verify?token=${encodeURIComponent(t)}`,
        { noAuth: true }
      );
      const reasonParam = result.reason
        ? `&reason=${encodeURIComponent(result.reason)}`
        : "";
      router.push(
        `${statusToPath(result.status)}?token=${encodeURIComponent(t)}&status=${result.status}${reasonParam}`
      );
    } catch {
      router.push(`/verify/not-found?token=${encodeURIComponent(t)}`);
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
      ? reason || "This document has been superseded by a corrected version. Please request the updated document."
      : "The token you entered does not match any document in our system. Please check the token and try again.";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo />
          <Link href="/" className="text-xs text-secondary hover:underline">
            Verify another document
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">{heading}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {description}
        </p>

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
          If you received this link from a student, ask them to share it again
          from their Votta portal.
        </p>
      </main>
    </div>
  );
}
