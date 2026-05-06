import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { Logo } from "./Logo";

export type NavItem = { label: string; to: string; icon: LucideIcon };

export function PortalShell({
  items,
  subtitle,
  userName,
  userRole,
  children,
}: {
  items: NavItem[];
  subtitle: string;
  userName: string;
  userRole: string;
  children: React.ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="hidden w-60 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="border-b border-sidebar-border px-5 py-5">
          <Logo subtitle={subtitle} light />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((item) => {
            const active =
              pathname === item.to ||
              (item.to !== "/" && pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border px-5 py-4 text-xs text-sidebar-foreground/60">
          Powered by Votta
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
          <div className="md:hidden">
            <Logo subtitle={subtitle} />
          </div>
          <div className="hidden text-sm text-muted-foreground md:block">
            {subtitle === "Administration" ? "Administration Portal" : "Student Portal"}
          </div>
          <button className="flex items-center gap-3 rounded-md px-2 py-1 hover:bg-muted">
            <div className="text-right leading-tight">
              <div className="text-sm font-medium">{userName}</div>
              <div className="text-xs text-muted-foreground">{userRole}</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {userName
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")}
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </header>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {action}
    </div>
  );
}
