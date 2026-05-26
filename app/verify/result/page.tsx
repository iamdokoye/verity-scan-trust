import { Suspense } from "react";
import { VerifiedResultContent } from "./VerifiedResultContent";

export default function VerifyResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground">Verifying document…</p>
        </div>
      }
    >
      <VerifiedResultContent />
    </Suspense>
  );
}
