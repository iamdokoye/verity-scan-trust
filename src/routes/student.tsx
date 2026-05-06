import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, FileText, GraduationCap, Share2 } from "lucide-react";
import { PortalShell } from "@/components/votta/PortalShell";
import { student } from "@/lib/mock-data";

export const Route = createFileRoute("/student")({
  component: StudentLayout,
});

function StudentLayout() {
  return (
    <PortalShell
      subtitle="Student Portal"
      userName={student.fullName}
      userRole={student.matric}
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
