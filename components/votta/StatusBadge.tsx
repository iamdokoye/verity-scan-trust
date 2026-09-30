import { cn } from "@/lib/utils";
import type { VerifyStatus } from "@/lib/verify-cache";

export type Tone = "success" | "danger" | "warning" | "neutral";

export const outcomeMeta: Record<VerifyStatus, { label: string; tone: Tone }> = {
  verified: { label: "Verified", tone: "success" },
  tampered: { label: "Tampered", tone: "danger" },
  invalid_signature: { label: "Invalid signature", tone: "danger" },
  revoked: { label: "Revoked", tone: "danger" },
  superseded: { label: "Superseded", tone: "warning" },
  not_found: { label: "Not found", tone: "neutral" },
};

const tones: Record<Tone, string> = {
  success: "text-success border-success/30 [background:color-mix(in_oklab,var(--success)_14%,transparent)]",
  danger: "text-destructive border-destructive/30 [background:color-mix(in_oklab,var(--destructive)_14%,transparent)]",
  warning: "text-warning border-warning/35 [background:color-mix(in_oklab,var(--warning)_16%,transparent)]",
  neutral: "text-muted-foreground border-border bg-muted/60",
};

export function StatusBadge({ status, className }: { status: VerifyStatus; className?: string }) {
  const meta = outcomeMeta[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase",
        tones[meta.tone],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}
