import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Download, QrCode, X, Copy } from "lucide-react";
import { documents } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/votta/PortalShell";
import { QrPlaceholder } from "@/components/votta/QrPlaceholder";

export const Route = createFileRoute("/student/documents")({
  component: DocumentsPage,
});

const FILTERS = ["All", "Certificates", "Transcripts", "Results"] as const;

function DocumentsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [open, setOpen] = useState<(typeof documents)[number] | null>(null);

  const filtered = documents.filter((d) => {
    if (filter === "All") return true;
    if (filter === "Certificates") return d.type.includes("Certificate");
    if (filter === "Transcripts") return d.type === "Transcript";
    return d.type === "Result";
  });

  return (
    <div>
      <PageTitle title="My Documents" />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((d) => (
          <div
            key={d.id}
            className="flex flex-col gap-4 rounded-lg border border-border border-l-4 border-l-success bg-card p-5 sm:flex-row sm:items-center"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">{d.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Uploaded {d.date}</span>
                <span>·</span>
                <span className="font-mono">hash {d.hash}…</span>
              </div>
              <span className="mt-2 inline-flex items-center rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-success">
                Cryptographically Signed
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(d)}>
                <QrCode className="h-4 w-4" /> View QR
              </Button>
              <Button size="sm">
                <Download className="h-4 w-4" /> Download
              </Button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="text-base font-semibold text-foreground">{open.title}</div>
                <div className="text-xs text-muted-foreground">Verification QR Code</div>
              </div>
              <button onClick={() => setOpen(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex justify-center py-4 text-foreground">
              <QrPlaceholder value={open.token} size={220} />
            </div>
            <div className="mt-4">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Verification URL</label>
              <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2">
                <code className="flex-1 truncate text-xs">https://votta.app/v/{open.token}</code>
                <button className="text-muted-foreground hover:text-foreground">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Show this QR code to any employer or institution to let them verify this document instantly.
            </p>
            <Button className="mt-5 w-full" variant="outline" onClick={() => setOpen(null)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
