"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Check,
  Copy,
  FileText,
  FileWarning,
  HelpCircle,
  History,
  Printer,
  RotateCcw,
  ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentPreview } from "@/components/votta/DocumentPreview";
import { GlassCard } from "@/components/votta/GlassCard";
import { StatusBadge, outcomeMeta } from "@/components/votta/StatusBadge";
import { cn } from "@/lib/utils";
import type { VerifyResult, VerifyStatus } from "@/lib/verify-cache";

const copy: Record<VerifyStatus, { headline: string; body: string }> = {
  verified: {
    headline: "This document is authentic and unchanged",
    body: "The document matches the record signed by the issuing institution. Nothing has been altered since it was issued.",
  },
  tampered: {
    headline: "This document does not match the original",
    body: "The file's fingerprint differs from the one the institution signed, so its content may have been altered. Do not accept this document. Ask the holder for a freshly issued copy, and contact the institution if you suspect fraud.",
  },
  invalid_signature: {
    headline: "The institution's signature could not be validated",
    body: "The record exists, but its digital signature does not check out against the institution's key. Do not rely on this document. Contact the issuing institution's registry.",
  },
  revoked: {
    headline: "This document has been revoked",
    body: "The issuing institution withdrew this record, so it is no longer valid evidence of the award. Do not accept it.",
  },
  superseded: {
    headline: "A newer version of this document exists",
    body: "This record was replaced by a corrected version. Ask the holder to share the updated document from their Votta portal.",
  },
  not_found: {
    headline: "No record matches this token",
    body: "Check the token for typing mistakes. If it still fails, ask the holder to share the QR code or link again from their Votta portal.",
  },
};

const icons: Record<VerifyStatus, typeof BadgeCheck> = {
  verified: BadgeCheck,
  tampered: FileWarning,
  invalid_signature: ShieldOff,
  revoked: FileText,
  superseded: History,
  not_found: HelpCircle,
};

const iconMotion: Record<VerifyStatus, string> = {
  verified: "",
  tampered: "animate-icon-jolt",
  invalid_signature: "animate-icon-pop",
  revoked: "animate-icon-pop",
  superseded: "animate-icon-spin-back",
  not_found: "animate-icon-float",
};

const toneRing = {
  success: "text-success [background:var(--gradient-success)]",
  danger: "text-destructive [background:var(--gradient-danger)]",
  warning: "text-warning [background:var(--gradient-warning)]",
  neutral: "text-muted-foreground [background:var(--gradient-primary)]",
} as const;

function formatDate(value?: string) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleDateString(undefined, { dateStyle: "long" });
}

export function ResultCard({
  status,
  token,
  data,
  reason,
  children,
}: {
  status: VerifyStatus;
  token?: string;
  data?: VerifyResult | null;
  reason?: string | null;
  /** Extra content shown above the actions (e.g. a retry form). */
  children?: ReactNode;
}) {
  const meta = outcomeMeta[status];
  const Icon = icons[status];
  const isBad = meta.tone === "danger";
  const why = reason ?? data?.reason ?? undefined;

  const fields: { label: string; value?: string; mono?: boolean; full?: boolean }[] = [
    { label: "Institution", value: data?.institution },
    { label: "Student", value: data?.studentName },
    { label: "Matriculation number", value: data?.matricNumber, mono: true },
    { label: "Document type", value: data?.documentType?.replace(/_/g, " ") },
    { label: "Programme", value: data?.programme ?? undefined },
    { label: "Issued", value: formatDate(data?.signedAt) },
    { label: "Checked", value: new Date().toLocaleString() },
    ...(why ? [{ label: "Reason", value: why, full: true }] : []),
  ];
  const shown = fields.filter((f) => f.value);
  const hasRecord = Boolean(data?.institution || data?.studentName);

  return (
    <GlassCard
      glossy
      tier="strong"
      className={cn("animate-rise overflow-hidden p-6 sm:p-8 print:shadow-none", isBad && "animate-shake")}
    >
      <div aria-hidden className={cn("-mx-6 -mt-6 mb-6 h-1 sm:-mx-8 sm:-mt-8", toneRing[meta.tone])} />
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4">
        <div
          className={cn(
            "relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white",
            toneRing[meta.tone],
            status === "verified" && "animate-ring-pulse",
          )}
          style={{ boxShadow: "inset 0 1px 0 var(--glass-highlight)" }}
        >
          {status === "verified" ? (
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="white" aria-hidden>
              <path
                className="animate-draw"
                d="M5 13l4 4L19 7"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <Icon className={cn("h-7 w-7 text-white", iconMotion[status])} strokeWidth={1.75} />
          )}
          {status === "revoked" && (
            <span className="animate-strike absolute h-0.5 w-9 rotate-[-45deg] rounded-full bg-white" />
          )}
        </div>
        <div className="min-w-0">
          <StatusBadge status={status} />
          <h1 className="mt-3 text-2xl leading-tight sm:text-3xl">{copy[status].headline}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy[status].body}</p>
        </div>
      </div>

      <DocumentPreview token={token} status={status} available={data?.previewAvailable} />

      {hasRecord && shown.length > 0 && (
        <dl className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-border/60 sm:grid-cols-2">
          {shown.map((f) => (
            <div key={f.label} className={cn("glass-subtle rounded-none p-4", f.full && "sm:col-span-2")}>
              <dt className="text-xs tracking-wide text-muted-foreground uppercase">{f.label}</dt>
              <dd className={cn("mt-1 text-sm font-semibold break-words", f.mono && "tabular font-mono tracking-wider")}>
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {!hasRecord && why && (
        <p className="mt-6 rounded-xl bg-muted/60 px-4 py-3 text-sm">
          <span className="text-xs tracking-wide text-muted-foreground uppercase">Reason</span>
          <span className="mt-1 block font-semibold">{why}</span>
        </p>
      )}

      {token && (
        <div className="mt-4 rounded-xl bg-muted/60 px-4 py-3">
          <span className="text-xs text-muted-foreground">Verification token</span>
          <p className="tabular font-mono text-sm font-semibold break-all">{token}</p>
        </div>
      )}

      {data?.sha256Hash && <HashRow hash={data.sha256Hash} />}

      {children}

      <div className="mt-7 flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row print:hidden">
        <Button variant="hero" size="lg" className="w-full sm:w-auto" asChild>
          <Link href="/">
            <RotateCcw strokeWidth={1.75} />
            Verify another document
          </Link>
        </Button>
        <Button variant="glass" size="lg" className="w-full sm:w-auto" onClick={() => window.print()}>
          <Printer strokeWidth={1.75} />
          Print this result
        </Button>
      </div>
    </GlassCard>
  );
}

function HashRow({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-muted/60 px-4 py-3">
      <div className="min-w-0">
        <span className="text-xs text-muted-foreground">Document fingerprint (SHA-256)</span>
        <p className="tabular truncate font-mono text-sm">{hash.slice(0, 24)}…</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Copy fingerprint"
        onClick={() => {
          navigator.clipboard?.writeText(hash);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
      >
        {copied ? <Check className="text-success" strokeWidth={1.75} /> : <Copy strokeWidth={1.75} />}
      </Button>
    </div>
  );
}
