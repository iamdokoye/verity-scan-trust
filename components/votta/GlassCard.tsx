import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tier = "subtle" | "base" | "strong";

const tiers: Record<Tier, string> = {
  subtle: "glass-subtle",
  base: "glass",
  strong: "glass-strong",
};

export function GlassCard({
  tier = "base",
  glossy = false,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tier?: Tier; glossy?: boolean }) {
  return (
    <div
      className={cn(tiers[tier], glossy && "glossy", "rounded-2xl", className)}
      {...props}
    />
  );
}
