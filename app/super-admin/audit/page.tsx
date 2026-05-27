import { ScrollText } from "lucide-react";

export default function AuditLogPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Audit Log
        </h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide activity log across all institutions.
        </p>
      </div>
      <div className="flex flex-col items-center rounded-lg border border-dashed border-border py-24 text-center">
        <ScrollText className="mb-3 h-8 w-8 text-muted-foreground/40" />
        <p className="font-medium text-foreground">Coming soon</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Full audit log with filters and export is being built.
        </p>
      </div>
    </div>
  );
}
