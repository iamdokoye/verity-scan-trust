"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { PublicPage } from "@/components/votta/PublicPage";
import { ResultCard } from "@/components/votta/ResultCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  cacheVerifyResult,
  type VerifyResult,
  type VerifyStatus,
} from "@/lib/verify-cache";

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
      const result = await api.get<VerifyResult>(
        `/verify?token=${encodeURIComponent(t)}`,
        { noAuth: true }
      );
      cacheVerifyResult(t, result);
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

  const resultStatus: VerifyStatus =
    status === "revoked" || status === "superseded" ? status : "not_found";
  const canRetry = resultStatus === "not_found";

  return (
    <PublicPage>
      <ResultCard
        status={resultStatus}
        token={initialToken || undefined}
        reason={reason}
      >
        {canRetry && (
          <form
            className="mt-6 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleRetry();
            }}
          >
            <label
              htmlFor="retry-token"
              className="text-xs tracking-wide text-muted-foreground uppercase"
            >
              Try another token
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                id="retry-token"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="font-mono tracking-wider"
                placeholder="Enter token to retry"
                autoComplete="off"
                spellCheck={false}
              />
              <Button
                type="submit"
                variant="hero"
                disabled={loading || !value.trim()}
                className="sm:w-auto"
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Search strokeWidth={1.75} />
                )}
                {loading ? "Checking…" : "Try again"}
              </Button>
            </div>
          </form>
        )}
      </ResultCard>
    </PublicPage>
  );
}
