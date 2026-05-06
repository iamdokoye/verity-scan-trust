import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Building2, Users, GraduationCap, FileText, ScrollText } from "lucide-react";
import { PortalShell } from "@/components/votta/PortalShell";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <PortalShell
      subtitle="Administration"
      userName="Dr. F. Adeyemi"
      userRole="Registrar"
      items={[
        { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
        { label: "Departments", to: "/admin/departments", icon: Building2 },
        { label: "Students", to: "/admin/students", icon: Users },
        { label: "Results", to: "/admin/results", icon: GraduationCap },
        { label: "Documents", to: "/admin/documents", icon: FileText },
        { label: "Audit Log", to: "/admin/audit", icon: ScrollText },
      ]}
    >
      <Outlet />
    </PortalShell>
  );
}
