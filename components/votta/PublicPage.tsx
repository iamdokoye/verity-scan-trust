import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/votta/SiteHeader";

/** Header + centred content + footer shared by the public verification pages. */
export function PublicPage({
  children,
  width = "max-w-3xl",
}: {
  children: ReactNode;
  width?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className={`mx-auto w-full flex-1 px-4 py-10 sm:px-6 sm:py-14 ${width}`}>{children}</main>
      <SiteFooter />
    </div>
  );
}
