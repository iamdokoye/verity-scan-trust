"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/votta/GlassCard";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <GlassCard glossy tier="strong" className="animate-rise w-full max-w-md p-8 text-center sm:p-10">
        <span
          className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-white"
          style={{ background: "var(--gradient-danger)", boxShadow: "inset 0 1px 0 var(--glass-highlight)" }}
        >
          <TriangleAlert className="h-7 w-7" strokeWidth={1.75} />
        </span>
        <h1 className="mt-5 text-xl font-bold">This page didn&apos;t load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button variant="hero" size="lg" onClick={reset}>
            Try again
          </Button>
          <Button variant="glass" size="lg" asChild>
            <a href="/">Go home</a>
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
