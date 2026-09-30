"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  ExternalLink,
  FileQuestion,
  FileWarning,
  FileX,
  History,
  RefreshCw,
  ShieldOff,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { outcomeMeta, type Tone } from "@/components/votta/StatusBadge";
import { ApiError, apiGetVerifyPreview } from "@/lib/api";
import type { VerifyStatus } from "@/lib/verify-cache";
import { cn } from "@/lib/utils";

const stampIcon: Record<VerifyStatus, LucideIcon> = {
  verified: BadgeCheck,
  tampered: FileWarning,
  invalid_signature: ShieldOff,
  revoked: FileX,
  superseded: History,
  not_found: FileQuestion,
};

const stampTone: Record<Tone, string> = {
  success: "[background:var(--gradient-success)]",
  danger: "[background:var(--gradient-danger)]",
  warning: "[background:var(--gradient-warning)]",
  neutral: "bg-muted-foreground",
};

const frameTone: Record<Tone, string> = {
  success: "ring-success/50",
  danger: "ring-destructive/60",
  warning: "ring-warning/50",
  neutral: "ring-border",
};

/** Why there is nothing to show, in words a verifier can act on. */
type Why =
  | { kind: "not_found" }
  | { kind: "file_missing" }
  | { kind: "no_preview" }
  | { kind: "http"; status: number }
  | { kind: "network" }
  | { kind: "render"; openUrl: string };

type Phase =
  | { kind: "loading" }
  | { kind: "image"; url: string }
  | { kind: "pdf"; url: string }
  | { kind: "unavailable"; why: Why };

function explain(why: Why): { title: string; body: string } {
  switch (why.kind) {
    case "not_found":
      return {
        title: "No document found for this token",
        body: "There is no issued document to show.",
      };
    case "file_missing":
      return {
        title: "The original file is missing",
        body: "It could not be retrieved from storage, so it cannot be shown or checked.",
      };
    case "no_preview":
      return {
        title: "This file type can't be previewed",
        body: "The result above still applies to the document.",
      };
    case "http":
      return {
        title: "The document couldn't be loaded",
        body:
          why.status === 404
            ? "The server has no preview for this document (HTTP 404). If this keeps happening, the server may need updating."
            : `The server couldn't provide the file (HTTP ${why.status}).`,
      };
    case "network":
      return {
        title: "The document couldn't be loaded",
        body: "The server could not be reached. Check your connection and try again.",
      };
    case "render":
      return {
        title: "This PDF couldn't be drawn here",
        body: "Your browser was unable to display it. You can open it directly instead.",
      };
  }
}

/**
 * The issued document behind a verification token, with a stamp showing the
 * outcome of the check. Shows the stored file: an image as-is, or the first
 * page of a PDF. When there is nothing to show it says why, and offers a
 * retry or a direct link where that can help.
 */
export function DocumentPreview({
  token,
  status,
  available,
  unavailableReason,
}: {
  token?: string;
  status: VerifyStatus;
  available?: boolean;
  unavailableReason?: "file_missing";
}) {
  const meta = outcomeMeta[status];
  const Icon = stampIcon[status];

  const knownWhy: Why | null =
    !token || status === "not_found"
      ? { kind: "not_found" }
      : unavailableReason === "file_missing"
        ? { kind: "file_missing" }
        : available === false
          ? { kind: "no_preview" }
          : null;

  const [fetched, setPhase] = useState<Phase>({ kind: "loading" });
  // What the result already tells us wins over anything the fetch found. It is
  // derived on every render because the result can arrive after first paint.
  const phase: Phase = knownWhy ? { kind: "unavailable", why: knownWhy } : fetched;
  const [attempt, setAttempt] = useState(0);

  const renderFailed = useCallback(
    (openUrl: string) => setPhase({ kind: "unavailable", why: { kind: "render", openUrl } }),
    [],
  );

  useEffect(() => {
    if (knownWhy || !token) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    apiGetVerifyPreview(token)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) return;
        if (blob.type.startsWith("image/")) setPhase({ kind: "image", url: objectUrl });
        else if (blob.type === "application/pdf") setPhase({ kind: "pdf", url: objectUrl });
        else setPhase({ kind: "unavailable", why: { kind: "no_preview" } });
      })
      .catch((err: unknown) => {
        console.error("[Votta] document preview failed", err);
        if (cancelled) return;
        setPhase({
          kind: "unavailable",
          why: err instanceof ApiError ? { kind: "http", status: err.status } : { kind: "network" },
        });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // knownWhy is derived from the props below, so those are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, attempt, Boolean(knownWhy)]);

  function retry() {
    setPhase({ kind: "loading" });
    setAttempt((n) => n + 1);
  }

  const failure = phase.kind === "unavailable" ? explain(phase.why) : null;
  const canRetry = phase.kind === "unavailable" && (phase.why.kind === "http" || phase.why.kind === "network");

  return (
    <figure className="mt-7" aria-label={`Document preview: ${meta.label}`}>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl bg-white ring-2",
          frameTone[meta.tone],
          phase.kind === "unavailable" && "bg-muted/60",
        )}
      >
        {phase.kind === "loading" && <Skeleton className="h-80 w-full rounded-none sm:h-96" />}
        {phase.kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={phase.url}
            alt="The issued document"
            className="mx-auto max-h-[32rem] w-full object-contain object-top"
          />
        )}
        {phase.kind === "pdf" && <PdfFirstPage url={phase.url} onFail={renderFailed} />}
        {phase.kind === "unavailable" && failure && (
          <div className="grid min-h-56 place-items-center px-6 py-12 text-center">
            <div className="max-w-md">
              <Icon className="mx-auto h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-3 text-sm font-semibold">{failure.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{failure.body}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {canRetry && (
                  <Button variant="glass" size="sm" onClick={retry}>
                    <RefreshCw strokeWidth={1.75} /> Try again
                  </Button>
                )}
                {phase.why.kind === "render" && (
                  <Button variant="glass" size="sm" asChild>
                    <a href={phase.why.openUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink strokeWidth={1.75} /> Open the document
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <span
          className={cn(
            "absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold tracking-widest text-white uppercase shadow-lg",
            stampTone[meta.tone],
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
          {meta.label}
        </span>
      </div>
    </figure>
  );
}

function PdfFirstPage({ url, onFail }: { url: string; onFail: (openUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const data = new Uint8Array(await (await fetch(url)).arrayBuffer());
        const pdf = await pdfjs.getDocument({ data }).promise;
        const page = await pdf.getPage(1);
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;

        // Render at the displayed width (up to 2x for sharpness).
        const cssWidth = canvas.parentElement?.clientWidth || 600;
        const base = page.getViewport({ scale: 1 });
        const scale = (cssWidth / base.width) * Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
        if (!cancelled) setRendered(true);
      } catch (err) {
        console.error("[Votta] PDF preview could not be drawn", err);
        if (!cancelled) onFail(url);
      }
    }
    render();

    return () => {
      cancelled = true;
    };
  }, [url, onFail]);

  return (
    <div className="relative max-h-[32rem] overflow-hidden">
      {!rendered && <Skeleton className="absolute inset-0 rounded-none" />}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="First page of the issued document"
        className={cn("block h-auto w-full", !rendered && "min-h-80 opacity-0")}
      />
    </div>
  );
}
