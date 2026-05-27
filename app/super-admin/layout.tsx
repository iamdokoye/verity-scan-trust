"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  ScrollText,
  KeyRound,
} from "lucide-react";
import { PortalShell } from "@/components/votta/PortalShell";
import { useAuth } from "@/lib/auth";

export default function SuperAdminLayout({
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
    if (state.status === "authenticated" && state.user.role !== "super_admin") {
      router.replace("/login");
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
  if (state.status === "authenticated" && state.user.role !== "super_admin")
    return null;

  return (
    <PortalShell
      subtitle="Platform Admin"
      userName={user?.email ?? "Super Admin"}
      userRole="Platform Administrator"
      onLogout={logout}
      items={[
        { label: "Dashboard", to: "/super-admin", icon: LayoutDashboard },
        {
          label: "Institutions",
          to: "/super-admin/institutions",
          icon: Building2,
        },
        { label: "Audit Log", to: "/super-admin/audit", icon: ScrollText },
        { label: "Crypto Keys", to: "/super-admin/keys", icon: KeyRound },
      ]}
    >
      {children}
    </PortalShell>
  );
}
