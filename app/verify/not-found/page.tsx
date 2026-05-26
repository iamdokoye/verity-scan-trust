import { Suspense } from "react";
import { NotFoundContent } from "./NotFoundContent";

export default function NotFoundPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <NotFoundContent />
    </Suspense>
  );
}
