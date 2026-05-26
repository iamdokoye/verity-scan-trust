import Link from "next/link";
import { semesters } from "@/lib/mock-data";
import { PageTitle } from "@/components/votta/PortalShell";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function ResultsAdmin() {
  return (
    <div>
      <PageTitle
        title="Results"
        action={
          <Button asChild>
            <Link href="/admin/results/new">
              <Plus className="h-4 w-4" /> Enter Results
            </Link>
          </Button>
        }
      />
      <div className="space-y-3">
        {semesters.map((s, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4"
          >
            <div>
              <div className="text-sm font-semibold text-foreground">
                {s.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {s.courses.length} courses recorded
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Avg GPA
              </div>
              <div className="text-lg font-semibold text-primary">
                {s.gpa.toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
