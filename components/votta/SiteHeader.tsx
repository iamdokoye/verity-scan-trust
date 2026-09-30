"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Moon, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/votta/Logo";
import { useTheme } from "@/lib/use-theme";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      {theme === "dark" ? <Sun strokeWidth={1.75} /> : <Moon strokeWidth={1.75} />}
    </Button>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40">
      <div className="glass rounded-none border-x-0 border-t-0">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="min-w-0" aria-label="Votta home">
            <Logo />
          </Link>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button variant="hero" size="sm" asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X strokeWidth={1.75} /> : <Menu strokeWidth={1.75} />}
            </Button>
          </div>
        </div>

        {open && (
          <nav className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pb-4 md:hidden">
            <Button variant="glass" className="w-full" asChild>
              <Link href="/login" onClick={() => setOpen(false)}>
                Sign in
              </Link>
            </Button>
            <Button variant="hero" className="w-full" asChild>
              <Link href="/signup" onClick={() => setOpen(false)}>
                Sign up
              </Link>
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border/60 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center text-xs text-muted-foreground sm:px-6">
        <p className="font-medium text-foreground">Votta — tamper-proof academic records</p>
        <p>SHA-256 hashing · RSA-2048 signatures · append-only audit log</p>
      </div>
    </footer>
  );
}
