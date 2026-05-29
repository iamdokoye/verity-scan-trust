"use client";

import { useEffect, useState } from "react";
import { FileText, Download, QrCode, X, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/votta/PortalShell";
import {
  apiGetMyStudent,
  apiGetStudentDocuments,
  apiGetDocumentDownloadUrl,
  type VottaDocument,
} from "@/lib/api";

const VERIFY_BASE =
  (typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? "https://votta.xyz") + "/v/";

const FILTERS = ["All", "Certificates", "Transcripts", "Other"] as const;

// ── QR display modal ──────────────────────────────────────────────────────────

function QrModal({
  doc,
  onClose,
}: {
  doc: VottaDocument;
  onClose: () => void;
}) {
  const verifyUrl = `${VERIFY_BASE}${doc.verificationToken}`;
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(verifyUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="text-base font-semibold text-foreground capitalize">
              {doc.documentType.replace(/_/g, " ")}
            </div>
            <div className="text-xs text-muted-foreground">Verification QR</div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* QR image (base64) or placeholder */}
        <div className="flex justify-center py-4">
          {doc.qrCodeBase64 ? (
            <img
              src={`data:image/png;base64,${doc.qrCodeBase64}`}
              alt="QR Code"
              className="h-56 w-56 rounded"
            />
          ) : (
            <div className="flex h-56 w-56 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">
              QR not generated yet
            </div>
          )}
        </div>

        <div className="mt-4">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Verification URL
          </label>
          <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2">
            <code className="flex-1 truncate text-xs text-foreground">{verifyUrl}</code>
            <button onClick={copy} className="text-muted-foreground hover:text-foreground">
              {copied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Show this QR to any employer or institution to verify instantly.
        </p>
        <Button className="mt-5 w-full" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

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
      alert(err instanceof Error ? err.message : "Download failed.");
    }
  }

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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-base font-medium text-foreground">
            {filter === "All" ? "No documents yet" : `No ${filter.toLowerCase()} found`}
          </p>
          <p className="text-sm text-muted-foreground">
            Documents uploaded and approved by your institution appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => {
            const isApproved = d.status === "approved";
            return (
              <div
                key={d.id}
                className={`flex flex-col gap-4 rounded-lg border bg-card p-5 sm:flex-row sm:items-center ${
                  isApproved ? "border-l-4 border-l-success border-border" : "border-border"
                }`}
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold capitalize text-foreground">
                    {d.documentType.replace(/_/g, " ")}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Uploaded {new Date(d.createdAt).toLocaleDateString()}</span>
                    {d.sha256Hash && (
                      <>
                        <span>·</span>
                        <span className="font-mono">
                          {d.sha256Hash.slice(0, 12)}…
                        </span>
                      </>
                    )}
                  </div>
                  {isApproved && (
                    <span className="mt-2 inline-flex items-center rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-success">
                      Cryptographically Signed
                    </span>
                  )}
                  {d.status !== "approved" && (
                    <span className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium capitalize text-amber-800">
                      {d.status.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {isApproved && d.verificationToken && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQrDoc(d)}
                    >
                      <QrCode className="h-4 w-4" /> View QR
                    </Button>
                  )}
                  <Button size="sm" onClick={() => handleDownload(d)}>
                    <Download className="h-4 w-4" /> Download
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {qrDoc && <QrModal doc={qrDoc} onClose={() => setQrDoc(null)} />}
    </div>
  );
}
