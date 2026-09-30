"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, Clock, FileDown, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PageTitle } from "@/components/votta/PortalShell";
import {
  apiGetMyStudent,
  apiGetStudentResults,
  apiListMyTranscriptRequests,
  apiRequestTranscript,
  type AcademicSummary,
  type TranscriptRequest,
} from "@/lib/api";

function RequestStatus({ request }: { request: TranscriptRequest }) {
  const when = new Date(request.decidedAt ?? request.createdAt).toLocaleDateString();
  if (request.status === "pending") {
    return (
      <Card className="mb-6 flex items-start gap-3 border-warning/40 p-4">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div className="text-sm">
          <p className="font-semibold">Transcript request sent</p>
          <p className="text-muted-foreground">
            Requested on {when}. The registry will review it and, once approved, your signed
            transcript appears under Documents.
          </p>
        </div>
      </Card>
    );
  }
  if (request.status === "approved") {
    return (
      <Card className="mb-6 flex items-start gap-3 border-success/40 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div className="text-sm">
          <p className="font-semibold">Your transcript was issued on {when}</p>
          <p className="text-muted-foreground">
            It is signed and ready to download or share.{" "}
            <Link href="/student/documents" className="font-semibold text-accent hover:underline">
              Open Documents
            </Link>
          </p>
        </div>
      </Card>
    );
  }
  return (
    <Card className="mb-6 flex items-start gap-3 border-destructive/40 p-4">
      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
      <div className="text-sm">
        <p className="font-semibold">Your last transcript request was declined ({when})</p>
        {request.decisionNote && (
          <p className="text-muted-foreground">Reason: {request.decisionNote}</p>
        )}
        <p className="text-muted-foreground">You can send a new request at any time.</p>
      </div>
    </Card>
  );
}

export default function ResultsPage() {
  const [summary, setSummary] = useState<AcademicSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true });
  const [requests, setRequests] = useState<TranscriptRequest[]>([]);
  const [requestOpen, setRequestOpen] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const latest = requests[0];
  const hasPending = latest?.status === "pending";

  async function sendRequest() {
    setSending(true);
    try {
      const created = await apiRequestTranscript(note);
      setRequests((r) => [created, ...r]);
      setRequestOpen(false);
      setNote("");
      toast.success("Transcript requested", {
        description: "The registry will review your request.",
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not send the request.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const student = await apiGetMyStudent();
        const s = await apiGetStudentResults(student.id);
        setSummary(s);
        // A failure here should not hide the results themselves.
        apiListMyTranscriptRequests()
          .then(setRequests)
          .catch(() => setRequests([]));
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load results."
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <PageTitle
        title="Academic Results"
        action={
          <Button
            variant="hero"
            disabled={loading || hasPending || !summary || summary.sessions.length === 0}
            title={hasPending ? "You already have a request awaiting review" : undefined}
            onClick={() => setRequestOpen(true)}
          >
            <FileDown className="h-4 w-4" />
            {hasPending ? "Request pending" : "Request transcript"}
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
        </div>
      ) : (
        <>
          {latest && <RequestStatus request={latest} />}

          {/* CGPA banner */}
          <Card className="mb-6 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Cumulative GPA
              </div>
              <div className="mt-1 text-5xl font-bold tracking-tight text-primary">
                {summary?.cgpa.toFixed(2) ?? "—"}
              </div>
            </div>
            {summary?.degreeClass && (
              <span className="rounded-full bg-success/10 px-4 py-2 text-sm font-semibold text-success">
                {summary.degreeClass}
              </span>
            )}
          </Card>

          {(!summary || summary.sessions.length === 0) ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-base font-medium text-foreground">
                No results recorded yet
              </p>
              <p className="text-sm text-muted-foreground">
                Results will appear here once your institution enters them.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.sessions.map((s, i) => {
                const isOpen = !!open[i];
                const totalUnits = s.results.reduce(
                  (a, r) => a + r.course.creditUnits,
                  0
                );
                const weighted = s.results.reduce(
                  (a, r) => a + r.course.creditUnits * r.gradePoint,
                  0
                );
                return (
                  <Card
                    key={i}
                    className="overflow-hidden p-0"
                  >
                    <button
                      onClick={() =>
                        setOpen((o) => ({ ...o, [i]: !isOpen }))
                      }
                      className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/40"
                    >
                      <span className="text-sm font-semibold text-foreground">
                        {s.sessionLabel} — {s.semester}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          Semester GPA
                        </span>
                        <span className="text-base font-semibold text-primary">
                          {s.gpa.toFixed(2)}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </span>
                    </button>
                    {isOpen && (
                      <div className="border-t border-border">
                        <div className="overflow-x-auto"><table className="w-full min-w-[34rem] text-sm">
                          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                            <tr>
                              <th className="px-5 py-2 text-left font-medium">
                                Code
                              </th>
                              <th className="px-5 py-2 text-left font-medium">
                                Title
                              </th>
                              <th className="px-5 py-2 text-center font-medium">
                                Units
                              </th>
                              <th className="px-5 py-2 text-center font-medium">
                                Grade
                              </th>
                              <th className="px-5 py-2 text-center font-medium">
                                Point
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.results.map((r, idx) => (
                              <tr
                                key={r.id}
                                className={
                                  idx % 2 === 0
                                    ? "bg-background"
                                    : "bg-muted/30"
                                }
                              >
                                <td className="px-5 py-2.5 font-mono text-foreground">
                                  {r.course.code}
                                </td>
                                <td className="px-5 py-2.5 text-foreground">
                                  {r.course.title}
                                </td>
                                <td className="px-5 py-2.5 text-center text-foreground">
                                  {r.course.creditUnits}
                                </td>
                                <td className="px-5 py-2.5 text-center font-semibold text-foreground">
                                  {r.grade}
                                </td>
                                <td className="px-5 py-2.5 text-center text-foreground">
                                  {r.gradePoint}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t border-border bg-muted/40 text-xs">
                            <tr>
                              <td
                                colSpan={2}
                                className="px-5 py-3 text-right font-medium text-muted-foreground"
                              >
                                Total Credit Units:{" "}
                                <span className="text-foreground">
                                  {totalUnits}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-center text-muted-foreground">
                                Weighted:{" "}
                                <span className="text-foreground">
                                  {weighted}
                                </span>
                              </td>
                              <td
                                colSpan={2}
                                className="px-5 py-3 text-center text-muted-foreground"
                              >
                                GPA:{" "}
                                <span className="font-semibold text-foreground">
                                  {s.gpa.toFixed(2)}
                                </span>
                              </td>
                            </tr>
                          </tfoot>
                        </table></div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Request a transcript</DialogTitle>
            <DialogDescription>
              Your registry reviews every request. Once approved, a signed transcript with a
              verification QR code is added to your Documents.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label htmlFor="transcript-note" className="mb-1.5 block text-sm font-medium">
              What is it for? <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="transcript-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="e.g. Masters application at the University of Ibadan"
            />
          </div>
          <DialogFooter>
            <Button variant="glass" onClick={() => setRequestOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button variant="hero" onClick={sendRequest} disabled={sending}>
              {sending ? "Sending…" : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
