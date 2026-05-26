import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { LayoutDashboard, Building2, Users, GraduationCap, FileText, ScrollText } from "lucide-react";
import { PortalShell } from "@/components/votta/PortalShell";
import { tokenStore } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    if (!tokenStore.get()) throw redirect({ to: "/login" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { user, logout } = useAuth();
  return (
    <PortalShell
      subtitle="Administration"
      userName={user?.email ?? "Admin"}
      userRole="Registrar"
      onLogout={logout}
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
