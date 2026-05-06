import { createFileRoute } from "@tanstack/react-router";
import { PageTitle } from "@/components/votta/PortalShell";

export const Route = createFileRoute("/admin/departments")({
  component: () => (
    <div>
      <PageTitle title="Departments" />
      <div className="rounded-lg border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Department management is part of a future iteration.
      </div>
    </div>
  ),
});
