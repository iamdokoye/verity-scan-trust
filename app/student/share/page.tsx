import Link from "next/link";
import { Share2, QrCode } from "lucide-react";
import { documents } from "@/lib/mock-data";
import { PageTitle } from "@/components/votta/PortalShell";
import { Button } from "@/components/ui/button";

export default function SharePage() {
  return (
    <div>
      <PageTitle title="Share Credentials" />
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        Generate a one-tap verification link for any of your signed documents.
        Recipients can verify instantly without an account.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {documents.map((d) => (
          <div key={d.id} className="rounded-lg border border-border bg-card p-5">
            <div className="text-sm font-semibold text-foreground">{d.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Token <span className="font-mono">{d.token}</span>
            </div>
            <div className="mt-4 flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/student/documents">
                  <QrCode className="h-4 w-4" /> View QR
                </Link>
              </Button>
              <Button size="sm">
                <Share2 className="h-4 w-4" /> Copy link
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
