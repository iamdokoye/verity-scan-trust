"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/votta/PortalShell";
import { GlassCard } from "@/components/votta/GlassCard";
import { apiGetIntegrity, type ChainVerification, type IntegrityReport } from "@/lib/api";
import { cn } from "@/lib/utils";

const brokenReason: Record<NonNullable<ChainVerification["reason"]>, string> = {
  cumulative_hash_mismatch: "A checkpoint no longer matches the one before it.",
  entry_missing: "An audit entry a checkpoint covers no longer exists.",
  entry_count_mismatch: "Audit entries were added or removed inside a checkpointed range.",
  batch_hash_mismatch: "An audit entry inside a checkpointed range was changed.",
};

function Summary({ ok, title, children }: { ok: boolean; title: string; children: React.ReactNode }) {
  const Icon = ok ? ShieldCheck : AlertTriangle;
  return (
    <GlassCard className="p-5">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white",
            ok ? "[background:var(--gradient-success)]" : "[background:var(--gradient-danger)]",
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          <div className="mt-1 text-sm text-muted-foreground">{children}</div>
        </div>
      </div>
    </GlassCard>
  );
}

export default function AuditIntegrityPage() {
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGetIntegrity()
      .then(setReport)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Could not load the integrity report."),
      );
  }, []);

  return (
    <div>
      <PageHeader
        title="Audit integrity"
        description="Checks that the audit log is intact and lists every database change made outside the Votta API."
      />

      {!report && !error && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {report && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Summary
              ok={report.chain.valid}
              title={report.chain.valid ? "Checkpoint chain intact" : "Audit log does not match its checkpoints"}
            >
              {report.chain.valid ? (
                <p>
                  {report.chain.entriesChecked} entries across {report.chain.checkpointsChecked} checkpoints
                  re-hashed and matched.
                  {report.chain.uncheckpointedEntries > 0 &&
                    ` ${report.chain.uncheckpointedEntries} newer entries are not covered until the next checkpoint.`}
                </p>
              ) : (
                <p>
                  {report.chain.reason ? brokenReason[report.chain.reason] : "The chain is broken."} Broken at
                  checkpoint <span className="font-mono">{report.chain.brokenAt}</span>.
                </p>
              )}
            </Summary>
            <Summary
              ok={report.directWriteCount === 0}
              title={
                report.directWriteCount === 0
                  ? "No direct database writes"
                  : `${report.directWriteCount} direct database write${report.directWriteCount === 1 ? "" : "s"}`
              }
            >
              <p>
                {report.directWriteCount === 0
                  ? "Every change to the watched tables came through the API."
                  : "Rows changed outside the API. Confirm each one was expected."}
              </p>
            </Summary>
          </div>

          {report.directWrites.length > 0 && (
            <GlassCard className="overflow-hidden p-0">
              <ul className="divide-y divide-border/60">
                {report.directWrites.map((w) => (
                  <li key={w.id} className="grid gap-1 px-4 py-3 text-sm sm:px-5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive uppercase">
                        {w.metadata?.operation ?? "write"}
                      </span>
                      <span className="font-mono text-xs">{w.metadata?.table ?? w.targetType}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(w.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs break-all text-muted-foreground">
                      Row {w.targetId ?? "unknown"} · by{" "}
                      <span className="font-semibold text-foreground">{w.metadata?.db_user ?? "unknown"}</span>
                      {w.metadata?.client_addr && ` from ${w.metadata.client_addr}`}
                      {w.metadata?.application_name && ` via ${w.metadata.application_name}`}
                    </p>
                    {(w.metadata?.changed_columns?.length ?? 0) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Changed: {w.metadata?.changed_columns?.join(", ")}
                      </p>
                    )}
                    {(w.metadata?.before || w.metadata?.after) && (
                      <pre className="mt-1 overflow-x-auto rounded-lg bg-muted/60 p-2 text-[11px]">
                        {JSON.stringify({ before: w.metadata?.before, after: w.metadata?.after }, null, 2)}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
}
