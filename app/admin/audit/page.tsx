import { Lock } from "lucide-react";
import { auditLog } from "@/lib/mock-data";
import { PageTitle } from "@/components/votta/PortalShell";
import { Input } from "@/components/ui/input";

const ACTION_COLORS: Record<string, string> = {
  "Document Upload": "bg-secondary/10 text-secondary",
  Verification: "bg-success/10 text-success",
  "Result Entry": "bg-secondary/10 text-secondary",
  Login: "bg-muted text-muted-foreground",
  "Failed Attempt": "bg-destructive/10 text-destructive",
};

export default function AuditPage() {
  return (
    <div>
      <PageTitle title="Audit Log" />

      <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Input type="date" />
        <select className="flex h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option>All actions</option>
          <option>Document Upload</option>
          <option>Result Entry</option>
          <option>Verification</option>
          <option>Login</option>
        </select>
        <Input
          placeholder="Search actor or target…"
          className="lg:col-span-2"
        />
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-md border border-warning/40 bg-warning/15 px-4 py-2 text-xs text-foreground">
        <Lock className="h-3.5 w-3.5" />
        This log is append-only. Entries cannot be modified or deleted.
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Timestamp</th>
              <th className="px-5 py-3 text-left font-medium">Actor</th>
              <th className="px-5 py-3 text-left font-medium">Action</th>
              <th className="px-5 py-3 text-left font-medium">Target</th>
              <th className="px-5 py-3 text-left font-medium">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {auditLog.map((e, i) => (
              <tr key={i}>
                <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                  {e.ts}
                </td>
                <td className="px-5 py-3">
                  <div className="text-foreground">{e.actor}</div>
                  <span className="mt-0.5 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {e.role}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${ACTION_COLORS[e.action] || "bg-muted text-muted-foreground"}`}
                  >
                    {e.action}
                  </span>
                </td>
                <td className="px-5 py-3 text-foreground">{e.target}</td>
                <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                  {e.ip}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <span>
            Showing 1–{auditLog.length} of {auditLog.length}
          </span>
          <div className="flex gap-1">
            <button className="rounded-md border border-border px-2.5 py-1 hover:bg-muted">
              Previous
            </button>
            <button className="rounded-md border border-border px-2.5 py-1 hover:bg-muted">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
