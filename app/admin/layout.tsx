"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Landmark,
  Users,
  GraduationCap,
  FileText,
  ScrollText,
} from "lucide-react";
import { PortalShell } from "@/components/votta/PortalShell";
import { useAuth } from "@/lib/auth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { state, user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (state.status === "authenticated" && state.user.role !== "admin") {
      router.replace(
        state.user.role === "super_admin" ? "/super-admin" : "/student"
      );
    }
  }, [state, router]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (state.status === "unauthenticated") return null;
  if (state.status === "authenticated" && state.user.role !== "admin")
    return null;

  return (
    <PortalShell
      subtitle="Administration"
      userName={user?.email ?? "Admin"}
      userRole="Registrar"
      onLogout={logout}
      items={[
        { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
        { label: "Faculties", to: "/admin/faculties", icon: Landmark },
        { label: "Departments", to: "/admin/departments", icon: Building2 },
        { label: "Students", to: "/admin/students", icon: Users },
        { label: "Results", to: "/admin/results", icon: GraduationCap },
        { label: "Documents", to: "/admin/documents", icon: FileText },
        { label: "Audit Log", to: "/admin/audit", icon: ScrollText },
      ]}
    >
      {children}
    </PortalShell>
  );
}
