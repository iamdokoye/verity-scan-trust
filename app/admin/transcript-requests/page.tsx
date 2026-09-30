"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, FileDown, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { GlassCard } from "@/components/votta/GlassCard";
import { PageHeader } from "@/components/votta/PortalShell";
import {
  apiApproveTranscriptRequest,
  apiListTranscriptRequests,
  apiRejectTranscriptRequest,
  type TranscriptRequest,
  type TranscriptRequestStatus,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const TABS: { key: TranscriptRequestStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Declined" },
];

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function TranscriptRequestsPage() {
  const [tab, setTab] = useState<TranscriptRequestStatus>("pending");
  const [items, setItems] = useState<TranscriptRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [approveTarget, setApproveTarget] = useState<TranscriptRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<TranscriptRequest | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Bumped to re-fetch after an action fails (the list may be stale).
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const data = await apiListTranscriptRequests(tab);
        if (cancelled) return;
        setItems(data);
        setError(null);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load requests.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [tab, reloadKey]);

  function switchTab(next: TranscriptRequestStatus) {
    if (next === tab) return;
    setLoading(true);
    setItems([]);
    setTab(next);
  }

  async function approve() {
    if (!approveTarget) return;
    setBusy(true);
    try {
      await apiApproveTranscriptRequest(approveTarget.id);
      toast.success("Transcript issued", {
        description: `${approveTarget.student?.fullName ?? "The student"} can now see it in their documents.`,
      });
      setItems((list) => list.filter((r) => r.id !== approveTarget.id));
      setApproveTarget(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not issue the transcript.");
      setReloadKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!rejectTarget) return;
    setBusy(true);
    try {
      await apiRejectTranscriptRequest(rejectTarget.id, rejectNote);
      toast.success("Request declined");
      setItems((list) => list.filter((r) => r.id !== rejectTarget.id));
      setRejectTarget(null);
      setRejectNote("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not decline the request.");
      setReloadKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Transcript requests"
        description="Students ask for transcripts here. Approving signs and issues the transcript."
      />

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Request status">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => switchTab(t.key)}
            className={cn(
              "min-h-11 rounded-full px-4 text-sm font-semibold transition-colors",
              tab === t.key ? "text-white [background:var(--gradient-primary)]" : "glass-subtle text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <GlassCard className="border-destructive/30 p-6 text-center text-sm text-destructive">{error}</GlassCard>
      ) : items.length === 0 ? (
        <GlassCard glossy className="grid place-items-center px-6 py-14 text-center">
          <span
            className="grid h-14 w-14 place-items-center rounded-2xl text-white"
            style={{ background: "var(--gradient-primary)" }}
          >
            {tab === "pending" ? (
              <CheckCircle2 className="h-7 w-7" strokeWidth={1.75} />
            ) : (
              <FileDown className="h-7 w-7" strokeWidth={1.75} />
            )}
          </span>
          <h2 className="mt-4 text-lg font-bold">
            {tab === "pending" ? "No requests waiting" : `No ${tab === "approved" ? "approved" : "declined"} requests`}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {tab === "pending"
              ? "New transcript requests from students will appear here."
              : "Decided requests will be listed here."}
          </p>
        </GlassCard>
      ) : (
        <ul className="grid gap-3">
          {items.map((r, i) => (
            <li key={r.id}>
              <GlassCard className="animate-rise p-4 sm:p-5" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/students/${r.studentId}`}
                      className="font-semibold hover:text-accent hover:underline"
                    >
                      {r.student?.fullName ?? "Student"}
                    </Link>
                    <p className="tabular font-mono text-xs text-muted-foreground">
                      {r.student?.matricNumber}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Requested {fmt(r.createdAt)}
                      {r.decidedAt && ` · decided ${fmt(r.decidedAt)}`}
                    </p>
                    {r.studentNote && (
                      <p className="mt-2 rounded-xl bg-muted/60 px-3 py-2 text-sm break-words">
                        <span className="text-xs tracking-wide text-muted-foreground uppercase">Student&apos;s note</span>
                        <span className="mt-0.5 block">{r.studentNote}</span>
                      </p>
                    )}
                    {r.decisionNote && (
                      <p className="mt-2 text-sm break-words text-muted-foreground">
                        Reason given: {r.decisionNote}
                      </p>
                    )}
                  </div>
                  {r.status === "pending" && (
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                      <Button variant="glass" onClick={() => setRejectTarget(r)}>
                        <X strokeWidth={1.75} /> Decline
                      </Button>
                      <Button variant="hero" onClick={() => setApproveTarget(r)}>
                        <Check strokeWidth={1.75} /> Approve &amp; issue
                      </Button>
                    </div>
                  )}
                </div>
              </GlassCard>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!approveTarget} onOpenChange={(o) => !busy && !o && setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Issue a transcript for {approveTarget?.student?.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This signs and issues an official transcript from the student&apos;s current results,
              adds it to their documents with a verification QR code, and{" "}
              <strong>locks their results</strong> against further edits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                approve();
              }}
            >
              {busy ? "Issuing…" : "Issue transcript"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !busy && !o && setRejectTarget(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Decline {rejectTarget?.student?.fullName}&apos;s request</DialogTitle>
            <DialogDescription>
              The student will see that the request was declined, along with your reason.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label htmlFor="reject-note" className="mb-1.5 block text-sm font-medium">
              Reason <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="reject-note"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="e.g. Outstanding fees. Please clear them with the bursary."
            />
          </div>
          <DialogFooter>
            <Button variant="glass" onClick={() => setRejectTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="hero" onClick={reject} disabled={busy}>
              {busy ? "Declining…" : "Decline request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
