"use client";

import { useSearchParams } from "next/navigation";
import { PublicPage } from "@/components/votta/PublicPage";
import { ResultCard } from "@/components/votta/ResultCard";

export function TamperedContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const status =
    searchParams.get("status") === "invalid_signature"
      ? "invalid_signature"
      : "tampered";

  return (
    <PublicPage>
      <ResultCard status={status} token={token || undefined}>
        <p className="mt-5 rounded-xl border border-warning/40 bg-warning/15 p-4 text-sm">
          If you believe this is an error, contact the issuing institution
          directly to confirm the document&apos;s authenticity.
        </p>
      </ResultCard>
    </PublicPage>
  );
}
