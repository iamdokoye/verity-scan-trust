"use client";

import { useSearchParams } from "next/navigation";
import { PublicPage } from "@/components/votta/PublicPage";
import { ResultCard } from "@/components/votta/ResultCard";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/votta/GlassCard";
import { useVerifyResult } from "@/lib/use-verify-result";

export function VerifiedResultContent() {
  const token = useSearchParams().get("token") ?? "";
  const { result, loading } = useVerifyResult(token);

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
