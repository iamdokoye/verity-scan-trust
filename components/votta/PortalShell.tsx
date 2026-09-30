"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Menu, type LucideIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Logo } from "./Logo";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export type NavItem = { label: string; to: string; icon: LucideIcon };

function NavList({
  items,
  activeTo,
  onNavigate,
}: {
  items: NavItem[];
  activeTo?: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {items.map((item) => {
        const active = activeTo === item.to;
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            href={item.to}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

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
  const [navOpen, setNavOpen] = useState(false);
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
    <div className="flex min-h-screen w-full overflow-x-hidden">
      <aside className="glass-panel hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="border-b border-sidebar-border px-5 py-5">
          <Logo subtitle={subtitle} light />
        </div>
        <NavList items={items} activeTo={activeItem?.to} />
        <div className="border-t border-sidebar-border px-5 py-4 text-xs text-sidebar-foreground/60">
          Powered by Votta
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-panel sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-border bg-background/70 px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <Sheet open={navOpen} onOpenChange={setNavOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open navigation menu"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md hover:bg-muted/50"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="flex w-72 max-w-[85vw] flex-col gap-0 border-sidebar-border bg-primary p-0 text-sidebar-foreground"
              >
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <SheetDescription className="sr-only">
                  {subtitle} portal navigation
                </SheetDescription>
                <div className="border-b border-sidebar-border px-5 py-5">
                  <Logo subtitle={subtitle} light />
                </div>
                <NavList
                  items={items}
                  activeTo={activeItem?.to}
                  onNavigate={() => setNavOpen(false)}
                />
                <div className="border-t border-sidebar-border px-5 py-4 text-xs text-sidebar-foreground/60">
                  Powered by Votta
                </div>
              </SheetContent>
            </Sheet>
            <div className="min-w-0 truncate">
              <Logo subtitle={subtitle} />
            </div>
          </div>
          <div className="hidden text-sm text-muted-foreground md:block">
            {subtitle} Portal
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50 sm:gap-3 sm:px-2"
            >
              <div className="hidden text-right leading-tight sm:block">
                <div className="max-w-[12rem] truncate text-sm font-medium">{userName}</div>
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
              <div className="glass-panel absolute right-0 top-full z-40 mt-1 w-56 max-w-[calc(100vw-1.5rem)] rounded-md border border-border bg-background">
                <div className="border-b border-border px-3 py-2 sm:hidden">
                  <div className="truncate text-sm font-medium">{userName}</div>
                  <div className="text-xs text-muted-foreground">{userRole}</div>
                </div>
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
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
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
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
      <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h1>
      {action}
    </div>
  );
}
