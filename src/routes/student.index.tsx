import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, CalendarDays, ShieldCheck, Share2 } from "lucide-react";
import { student, documents } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/student/")({
  component: Dashboard,
});

function Stat({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary/10 text-secondary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold text-foreground">{value}</div>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div>
      <div className="mb-6 rounded-lg border border-border bg-card p-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back, {student.firstName}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{student.institution}</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat icon={FileText} label="Total Documents" value={documents.length} />
        <Stat icon={CalendarDays} label="Semesters Completed" value={10} />
        <Stat icon={ShieldCheck} label="Times Verified" value={47} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold text-foreground">Recent Documents</h3>
          <Link to="/student/documents" className="text-xs text-secondary hover:underline">
            View all
          </Link>
        </div>
        <ul className="divide-y divide-border">
          {documents.slice(0, 3).map((d) => (
            <li key={d.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{d.title}</div>
                <div className="text-xs text-muted-foreground">{d.date}</div>
              </div>
              <span className="hidden rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-success sm:inline-flex">
                Verified
              </span>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4" /> Share
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
