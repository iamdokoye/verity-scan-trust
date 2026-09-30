"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  FileQuestion,
  FileWarning,
  FileX,
  History,
  ShieldOff,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { outcomeMeta, type Tone } from "@/components/votta/StatusBadge";
import { apiGetVerifyPreview } from "@/lib/api";
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

type Phase =
  | { kind: "loading" }
  | { kind: "image"; url: string }
  | { kind: "pdf"; url: string }
  | { kind: "unavailable" };

/**
 * The issued document behind a verification token, with a stamp showing the
 * outcome of the check. Shows the stored file: an image as-is, or the first
 * page of a PDF. For an unknown token there is nothing to show, so a
 * placeholder carries the "not found" stamp instead.
 */
export function DocumentPreview({
  token,
  status,
  available,
}: {
  token?: string;
  status: VerifyStatus;
  available?: boolean;
}) {
  const meta = outcomeMeta[status];
  const Icon = stampIcon[status];
  const canShow = Boolean(token) && status !== "not_found" && available !== false;
  const [phase, setPhase] = useState<Phase>(
    canShow ? { kind: "loading" } : { kind: "unavailable" },
  );

  const showUnavailable = useCallback(() => setPhase({ kind: "unavailable" }), []);

  useEffect(() => {
    if (!canShow || !token) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    apiGetVerifyPreview(token)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) return;
        if (blob.type.startsWith("image/")) setPhase({ kind: "image", url: objectUrl });
        else if (blob.type === "application/pdf") setPhase({ kind: "pdf", url: objectUrl });
        else setPhase({ kind: "unavailable" });
      })
      .catch(() => {
        if (!cancelled) setPhase({ kind: "unavailable" });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token, canShow]);

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
        {phase.kind === "pdf" && <PdfFirstPage url={phase.url} onFail={showUnavailable} />}
        {phase.kind === "unavailable" && (
          <div className="grid h-56 place-items-center px-6 text-center">
            <div>
              <Icon className="mx-auto h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-3 text-sm font-semibold">
                {status === "not_found" ? "No document found for this token" : "Document preview unavailable"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {status === "not_found"
                  ? "There is no issued document to show."
                  : "The result above still applies to this document."}
              </p>
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

function PdfFirstPage({ url, onFail }: { url: string; onFail: () => void }) {
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
      } catch {
        if (!cancelled) onFail();
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
