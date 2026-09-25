"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, type LucideIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Logo } from "./Logo";

export type NavItem = { label: string; to: string; icon: LucideIcon };

export function PortalShell({
  items,
  subtitle,
  userName,
  userRole,
  onLogout,
  children,
}: {
  items: NavItem[];
  subtitle: string;
  userName: string;
  userRole: string;
  onLogout?: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const activeItem = items
    .filter((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex min-h-screen">
      <aside className="glass-panel hidden w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="border-b border-sidebar-border px-5 py-5">
          <Logo subtitle={subtitle} light />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((item) => {
            const active = activeItem?.to === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                href={item.to}
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
        <header className="glass-panel sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/70 px-6">
          <div className="md:hidden">
            <Logo subtitle={subtitle} />
          </div>
          <div className="hidden text-sm text-muted-foreground md:block">
            {subtitle} Portal
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-3 rounded-md px-2 py-1 hover:bg-muted/50"
            >
              <div className="text-right leading-tight">
                <div className="text-sm font-medium">{userName}</div>
                <div className="text-xs text-muted-foreground">{userRole}</div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {userName
                  .split(/[\s@]/)
                  .map((p) => p[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            {menuOpen && onLogout && (
              <div className="glass-panel absolute right-0 top-full mt-1 w-40 rounded-md border border-border bg-popover">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted/50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageTitle({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      {action}
    </div>
  );
}
