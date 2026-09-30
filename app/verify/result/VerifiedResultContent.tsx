"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PublicPage } from "@/components/votta/PublicPage";
import { ResultCard } from "@/components/votta/ResultCard";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/votta/GlassCard";
import { api } from "@/lib/api";
import { getCachedVerifyResult, type VerifyResult } from "@/lib/verify-cache";

export function VerifiedResultContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const cached = getCachedVerifyResult(token);
    if (cached) {
      setResult(cached);
      setLoading(false);
      return;
    }
    api
      .get<VerifyResult>(`/verify?token=${encodeURIComponent(token)}`, {
        noAuth: true,
      })
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <PublicPage>
        <GlassCard tier="strong" className="p-6 sm:p-8" aria-busy="true" aria-label="Verifying document">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-7 w-3/4" />
            </div>
          </div>
          <Skeleton className="mt-6 h-40 w-full rounded-2xl" />
        </GlassCard>
      </PublicPage>
    );
  }

  return (
    <PublicPage>
      <ResultCard
        key={token}
        status={result?.status ?? "not_found"}
        token={token || undefined}
        data={result}
      />
    </PublicPage>
  );
}
