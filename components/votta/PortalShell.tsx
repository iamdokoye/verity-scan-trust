"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Moon, ShieldCheck, Sun, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/lib/use-theme";
import { cn } from "@/lib/utils";

export type NavItem = { label: string; to: string; icon: LucideIcon };

type Props = {
  items: NavItem[];
  subtitle: string;
  userName: string;
  userRole: string;
  onLogout?: () => void;
  /** Show a bottom tab bar on small screens (used by the student portal). */
  tabBar?: boolean;
  children: ReactNode;
};

function initialsOf(name: string) {
  return (
    name
      .split(/[\s@.]/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "V"
  );
}

function Brand({ subtitle }: { subtitle: string }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white"
        style={{ background: "var(--gradient-primary)", boxShadow: "inset 0 1px 0 var(--glass-highlight)" }}
      >
        <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-lg leading-none font-extrabold tracking-tight">
          Votta
        </span>
        <span className="block truncate text-[11px] tracking-widest text-muted-foreground uppercase">
          {subtitle}
        </span>
      </span>
    </Link>
  );
}

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
    <nav className="flex flex-col gap-1" aria-label="Portal">
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeTo === item.to;
        return (
          <Link
            key={item.to}
            href={item.to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
              active
                ? "glass-strong text-foreground shadow-none [&>svg]:text-accent"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserMenu({
  userName,
  userRole,
  onLogout,
}: {
  userName: string;
  userRole: string;
  onLogout?: () => void;
}) {
  const { theme, toggle } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex min-h-11 items-center gap-2 rounded-full p-1 transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:pr-3"
          aria-label="Open user menu"
        >
          <span
            className="grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-white"
            style={{ background: "var(--gradient-primary)" }}
          >
            {initialsOf(userName)}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block max-w-[11rem] truncate text-sm leading-tight font-semibold">
              {userName}
            </span>
            <span className="block text-xs text-muted-foreground">{userRole}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 max-w-[calc(100vw-1.5rem)] rounded-xl">
        <DropdownMenuLabel>
          <span className="block truncate text-sm">{userName}</span>
          <span className="block text-xs font-normal text-muted-foreground">{userRole}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            toggle();
          }}
        >
          {theme === "dark" ? <Sun /> : <Moon />} {theme === "dark" ? "Light mode" : "Dark mode"}
        </DropdownMenuItem>
        {onLogout && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onLogout} className="text-destructive focus:text-destructive">
              <LogOut /> Sign out
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PortalShell({
  items,
  subtitle,
  userName,
  userRole,
  onLogout,
  tabBar = false,
  children,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();

  // Longest matching route wins, so /admin/students doesn't also light up /admin.
  const activeTo = items
    .filter((i) => pathname === i.to || pathname.startsWith(`${i.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0]?.to;

  return (
    <div className="min-h-screen">
      <aside className="glass fixed inset-y-3 left-3 z-30 hidden w-64 flex-col rounded-2xl p-4 lg:flex">
        <Brand subtitle={subtitle} />
        <div className="mt-8 flex-1 overflow-y-auto">
          <NavList items={items} activeTo={activeTo} />
        </div>
        <p className="glass-subtle mt-4 rounded-xl p-3 text-xs text-muted-foreground">
          SHA-256 hashing · RSA-2048 signatures · append-only audit log
        </p>
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 max-w-[85vw] border-r-0 p-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">{subtitle} navigation</SheetDescription>
          <Brand subtitle={subtitle} />
          <div className="mt-8">
            <NavList items={items} activeTo={activeTo} onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="lg:pl-[17.5rem]">
        <header className="sticky top-0 z-20 px-3 pt-3">
          <div className="glass grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-3 py-2 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              {!tabBar && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open navigation menu"
                  onClick={() => setOpen(true)}
                >
                  <Menu strokeWidth={1.75} />
                </Button>
              )}
              <div className="min-w-0 lg:hidden">
                <Brand subtitle={subtitle} />
              </div>
              <p className="hidden truncate text-sm text-muted-foreground lg:block">{subtitle}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                className="hidden sm:inline-flex"
              >
                {theme === "dark" ? <Sun strokeWidth={1.75} /> : <Moon strokeWidth={1.75} />}
              </Button>
              <UserMenu userName={userName} userRole={userRole} onLogout={onLogout} />
            </div>
          </div>
        </header>
        <main
          className={cn(
            "mx-auto w-full max-w-6xl min-w-0 px-4 py-6 sm:px-6 sm:py-8",
            tabBar && "pb-28 lg:pb-8",
          )}
        >
          {children}
        </main>
      </div>

      {tabBar && (
        <nav
          aria-label="Tabs"
          className="glass-strong fixed inset-x-3 bottom-3 z-30 grid rounded-2xl p-1.5 lg:hidden"
          style={{
            gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))`,
            paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))",
          }}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const active = activeTo === item.to;
            return (
              <Link
                key={item.to}
                href={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-center text-[11px] leading-tight font-medium transition-colors",
                  active ? "text-white" : "text-muted-foreground",
                )}
                style={active ? { background: "var(--gradient-primary)" } : undefined}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 grid gap-4 sm:flex sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Existing pages call this; it renders the same header as PageHeader. */
export function PageTitle({ title, action }: { title: string; action?: ReactNode }) {
  return <PageHeader title={title} actions={action} />;
}
