"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageTitle } from "@/components/votta/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  QrCode,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  apiListPendingDocuments,
  apiApproveDocument,
  apiRejectDocument,
  apiGetDocumentDownloadUrl,
  type VottaDocument,
} from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  pending_approval:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  approved:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  rejected:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  superseded:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  revoked:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {label}
    </span>
  );
}

function DocTypeLabel({ type }: { type: string }) {
  const MAP: Record<string, string> = {
    degree_certificate: "Degree Cert.",
    transcript: "Transcript",
    other: "Other",
  };
  return <span>{MAP[type] ?? type}</span>;
}

// ── Reject dialog ─────────────────────────────────────────────────────────────

interface RejectDialogProps {
  doc: VottaDocument | null;
  onClose: () => void;
  onConfirm: (docId: string, reason: string) => Promise<void>;
}

function RejectDialog({ doc, onClose, onConfirm }: RejectDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!doc) return;
    setErr(null);
    setLoading(true);
    try {
      await onConfirm(doc.id, reason);
      onClose();
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Failed to reject document.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Provide a reason for rejection. The uploader will see this note.
          </p>
          <Input
            placeholder="Rejection reason (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            minLength={3}
          />
          {err && (
            <p className="text-xs text-destructive">{err}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={loading || reason.trim().length < 3}
            >
              {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DocsAdmin() {
  const [docs, setDocs] = useState<VottaDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<VottaDocument | null>(null);

  const fetchDocs = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiListPendingDocuments(p);
      setDocs(result.items);
      setTotal(result.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs(page);
  }, [fetchDocs, page]);

  async function handleApprove(doc: VottaDocument) {
    setActionLoading(doc.id);
    try {
      await apiApproveDocument(doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Approve failed.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(docId: string, reason: string) {
    setActionLoading(docId);
    try {
      await apiRejectDocument(docId, reason);
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      setTotal((t) => Math.max(0, t - 1));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDownload(doc: VottaDocument) {
    try {
      const { url } = await apiGetDocumentDownloadUrl(doc.id);
      window.open(url, "_blank");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not get download URL.");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageTitle
        title="Documents — Approval Queue"
        action={
          <Button asChild>
            <Link href="/admin/documents/upload">
              <Upload className="h-4 w-4" /> Upload Document
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchDocs(page)}>
            Retry
          </Button>
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <CheckCircle className="h-10 w-10 text-emerald-500" />
          <p className="text-base font-medium text-foreground">
            No documents pending approval
          </p>
          <p className="text-sm text-muted-foreground">
            All documents have been reviewed. Upload a new document to get started.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3 text-sm text-muted-foreground">
            {total} document{total !== 1 ? "s" : ""} awaiting review
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Student</th>
                  <th className="px-5 py-3 text-left font-medium">Type</th>
                  <th className="hidden px-5 py-3 text-left font-medium lg:table-cell">
                    File
                  </th>
                  <th className="hidden px-5 py-3 text-left font-medium lg:table-cell">
                    Uploaded
                  </th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {docs.map((d) => {
                  const isActing = actionLoading === d.id;
                  return (
                    <tr key={d.id} className="hover:bg-muted/30">
                      <td className="px-5 py-3">
                        <div className="font-medium text-foreground">
                          {d.student?.fullName ?? "—"}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {d.student?.matricNumber ?? ""}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-foreground">
                        <DocTypeLabel type={d.documentType} />
                      </td>
                      <td className="hidden px-5 py-3 lg:table-cell">
                        <div className="max-w-[180px] truncate text-foreground">
                          {d.fileName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(d.fileSizeBytes / 1024).toFixed(0)} KB
                        </div>
                      </td>
                      <td className="hidden px-5 py-3 text-muted-foreground lg:table-cell">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {d.status === "pending_approval" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
                                disabled={isActing}
                                onClick={() => handleApprove(d)}
                              >
                                {isActing ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                                <span className="ml-1.5 hidden sm:inline">Approve</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:border-destructive hover:bg-destructive/10"
                                disabled={isActing}
                                onClick={() => setRejectTarget(d)}
                              >
                                <XCircle className="h-4 w-4" />
                                <span className="ml-1.5 hidden sm:inline">Reject</span>
                              </Button>
                            </>
                          )}
                          {d.verificationToken && (
                            <Button variant="outline" size="sm">
                              <QrCode className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(d)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <RejectDialog
        doc={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
      />
    </div>
  );
}
