"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, FileText, GraduationCap, Share2 } from "lucide-react";
import { PortalShell } from "@/components/votta/PortalShell";
import { useAuth } from "@/lib/auth";

export default function StudentLayout({
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
    if (state.status === "authenticated" && state.user.role !== "student") {
      router.replace(
        state.user.role === "super_admin" ? "/super-admin" : "/admin"
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
  if (state.status === "authenticated" && state.user.role !== "student")
    return null;

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
      {children}
    </PortalShell>
  );
}
