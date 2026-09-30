"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { GlassCard } from "@/components/votta/GlassCard";
import { PublicPage } from "@/components/votta/PublicPage";
import { resolveVerificationPath } from "@/lib/verify-flow";

export function VerifyRedirect() {
  const router = useRouter();
  const token = useSearchParams().get("token")?.trim() ?? "";

  useEffect(() => {
    if (!token) {
      router.replace("/");
      return;
    }
    let cancelled = false;
    resolveVerificationPath(token).then((path) => {
      if (!cancelled) router.replace(path);
    });
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <PublicPage>
      <GlassCard tier="strong" className="grid place-items-center gap-3 px-6 py-16 text-center" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-muted-foreground">Verifying document…</p>
      </GlassCard>
    </PublicPage>
  );
}
