import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/votta/GlassCard";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <GlassCard glossy tier="strong" className="animate-rise w-full max-w-md p-8 text-center sm:p-10">
        <span
          className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-white"
          style={{ background: "var(--gradient-primary)", boxShadow: "inset 0 1px 0 var(--glass-highlight)" }}
        >
          <Compass className="h-7 w-7" strokeWidth={1.75} />
        </span>
        <p className="tabular text-gradient mt-5 font-display text-6xl font-extrabold">404</p>
        <h1 className="mt-2 text-xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Button variant="hero" size="lg" className="mt-6 w-full sm:w-auto" asChild>
          <Link href="/">Go home</Link>
        </Button>
      </GlassCard>
    </div>
  );
}
