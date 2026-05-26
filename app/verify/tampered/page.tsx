import { Suspense } from "react";
import { TamperedContent } from "./TamperedContent";

export default function TamperedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <TamperedContent />
    </Suspense>
  );
}
