"use client";

import { useEffect, useState } from "react";
import { Award, Check, Clock, Copy, Download, FileText, History, QrCode, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/votta/GlassCard";
import { PageHeader } from "@/components/votta/PortalShell";
import {
  apiGetMyStudent,
  apiGetStudentDocuments,
  apiGetDocumentDownloadUrl,
  type VottaDocument,
} from "@/lib/api";
import { verifyUrlFor } from "@/lib/qr";
import { VerificationQr } from "@/components/votta/VerificationQr";
import { cn } from "@/lib/utils";

const FILTERS = ["All", "Certificates", "Transcripts", "Other"] as const;

const typeIcon = {
  degree_certificate: Award,
  transcript: ScrollText,
  other: FileText,
} as const;

const typeLabel = (d: VottaDocument) => d.documentType.replace(/_/g, " ");

function StatusPill({ status }: { status: VottaDocument["status"] }) {
  if (status === "approved") {
    return (
      <span className="rounded-full border border-success/30 px-2.5 py-0.5 text-xs font-semibold text-success">
        Signed
      </span>
    );
  }
  const Icon = status === "superseded" ? History : Clock;
  const bad = status === "revoked" || status === "rejected";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
        bad ? "border-destructive/30 text-destructive" : "border-warning/35 text-warning",
      )}
    >
      <Icon className="h-3 w-3" />
      {status.replace(/_/g, " ")}
    </span>
  );
}

function QrDialog({ doc, onClose }: { doc: VottaDocument; onClose: () => void }) {
  const verifyUrl = verifyUrlFor(doc.verificationToken ?? "");
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard
      .writeText(verifyUrl)
      .then(() => toast.success("Link copied"))
      .catch(() => toast.error("Couldn't copy the link"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="capitalize">{typeLabel(doc)}</DialogTitle>
          <DialogDescription>Show this QR code to anyone who needs to verify the document.</DialogDescription>
        </DialogHeader>
        <div className="mx-auto w-fit rounded-3xl bg-white p-4">
          <div className="w-56 max-w-full">
            <VerificationQr url={verifyUrl} label="Verification QR code" />
          </div>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-muted/60 p-2 pl-4">
          <span className="tabular truncate font-mono text-xs">{verifyUrl}</span>
          <Button variant="ghost" size="icon" aria-label="Copy link" onClick={copy}>
            {copied ? <Check className="text-success" /> : <Copy />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function StudentDocuments() {
  const [docs, setDocs] = useState<VottaDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [qrDoc, setQrDoc] = useState<VottaDocument | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const student = await apiGetMyStudent();
        const d = await apiGetStudentDocuments(student.id);
        setDocs(d);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load documents.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = docs.filter((d) => {
    if (filter === "All") return true;
    if (filter === "Certificates") return d.documentType === "degree_certificate";
    if (filter === "Transcripts") return d.documentType === "transcript";
    return d.documentType === "other";
  });

  async function handleDownload(doc: VottaDocument) {
    try {
      const { url } = await apiGetDocumentDownloadUrl(doc.id);
      window.open(url, "_blank");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Download failed.");
    }
  }

  return (
    <>
      <PageHeader title="Documents" description="Signed by your institution and verifiable by anyone." />

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Filter documents">
        {FILTERS.map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              "min-h-11 rounded-full px-4 text-sm font-semibold transition-colors",
              filter === f ? "text-white [background:var(--gradient-primary)]" : "glass-subtle text-muted-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <GlassCard className="border-destructive/30 p-6 text-center text-sm text-destructive">{error}</GlassCard>
      ) : filtered.length === 0 ? (
        <GlassCard className="px-6 py-14 text-center">
          <p className="text-base font-bold">
            {filter === "All" ? "No documents yet" : `No ${filter.toLowerCase()} found`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Documents uploaded and approved by your institution appear here.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d, i) => {
            const Icon = typeIcon[d.documentType] ?? FileText;
            const isApproved = d.status === "approved";
            return (
              <GlassCard
                key={d.id}
                glossy
                className="animate-rise flex flex-col p-5"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="grid h-11 w-11 place-items-center rounded-xl text-white"
                    style={{ background: "var(--gradient-primary)", boxShadow: "inset 0 1px 0 var(--glass-highlight)" }}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <StatusPill status={d.status} />
                </div>
                <h2 className="mt-4 text-base font-bold capitalize">{typeLabel(d)}</h2>
                <p className="text-xs text-muted-foreground">
                  Uploaded {new Date(d.createdAt).toLocaleDateString()}
                </p>
                {d.verificationToken && (
                  <p className="tabular mt-3 font-mono text-sm break-all">{d.verificationToken.trim()}</p>
                )}
                {d.sha256Hash && (
                  <p className="tabular mt-1 truncate font-mono text-xs text-muted-foreground">
                    {d.sha256Hash.slice(0, 20)}…
                  </p>
                )}
                <div className="mt-auto flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row">
                  {isApproved && d.verificationToken && (
                    <Button variant="glass" size="sm" className="flex-1" onClick={() => setQrDoc(d)}>
                      <QrCode strokeWidth={1.75} /> View QR
                    </Button>
                  )}
                  <Button variant="hero" size="sm" className="flex-1" onClick={() => handleDownload(d)}>
                    <Download strokeWidth={1.75} /> Download
                  </Button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {qrDoc && <QrDialog doc={qrDoc} onClose={() => setQrDoc(null)} />}
    </>
  );
}
