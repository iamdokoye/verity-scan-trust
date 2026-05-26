import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { LayoutDashboard, FileText, GraduationCap, Share2 } from "lucide-react";
import { PortalShell } from "@/components/votta/PortalShell";
import { tokenStore } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/student")({
  beforeLoad: () => {
    if (!tokenStore.get()) throw redirect({ to: "/login" });
  },
  component: StudentLayout,
});

function StudentLayout() {
  const { user, logout } = useAuth();
  return (
    <PortalShell
      subtitle="Student Portal"
      userName={user?.email ?? "Student"}
      userRole="Student"
      onLogout={logout}
      items={[
        { label: "Dashboard", to: "/student", icon: LayoutDashboard },
        { label: "My Documents", to: "/student/documents", icon: FileText },
        { label: "Results", to: "/student/results", icon: GraduationCap },
        { label: "Share Credentials", to: "/student/share", icon: Share2 },
      ]}
    >
      <Outlet />
    </PortalShell>
  );
}
