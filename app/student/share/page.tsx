"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, Share2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/votta/PortalShell";
import { GlassCard } from "@/components/votta/GlassCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGetMyStudent, apiGetStudentDocuments, type VottaDocument } from "@/lib/api";
import { qrImageSrc } from "@/lib/qr";
import { cn } from "@/lib/utils";

const verifyBase = () =>
  `${typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? "")}/verify?token=`;

const label = (d: VottaDocument) => d.documentType.replace(/_/g, " ");

export default function SharePage() {
  const [docs, setDocs] = useState<VottaDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const student = await apiGetMyStudent();
        const d = await apiGetStudentDocuments(student.id);
        // Only approved docs with verification tokens can be shared
        setDocs(d.filter((x) => x.status === "approved" && x.verificationToken));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load documents.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const doc = docs.find((d) => d.id === selectedId) ?? docs[0];
  const url = doc ? `${verifyBase()}${doc.verificationToken}` : "";
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  function copy() {
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Link copied"))
      .catch(() => toast.error("Couldn't copy the link"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <PageHeader
        title="Share"
        description="Anyone can scan this code or open the link to verify your document. No account needed."
      />

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_1fr]">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : error ? (
        <GlassCard className="border-destructive/30 p-6 text-center text-sm text-destructive">{error}</GlassCard>
      ) : !doc ? (
        <GlassCard className="px-6 py-14 text-center">
          <p className="text-base font-bold">No shareable documents yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Documents must be approved by your institution before they can be shared.
          </p>
        </GlassCard>
      ) : (
        <>
          {docs.length > 1 && (
            <div className="mb-5 flex flex-wrap gap-2" role="radiogroup" aria-label="Document to share">
              {docs.map((d) => (
                <button
                  key={d.id}
                  role="radio"
                  aria-checked={d.id === doc.id}
                  onClick={() => setSelectedId(d.id)}
                  className={cn(
                    "glass-subtle min-h-11 rounded-full px-4 text-sm font-semibold capitalize",
                    d.id === doc.id ? "ring-2 ring-ring" : "text-muted-foreground",
                  )}
                >
                  {label(d)}
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_1fr]">
            <GlassCard glossy tier="strong" className="animate-rise p-6 text-center sm:p-8" key={doc.id}>
              <div
                className="mx-auto w-fit rounded-3xl bg-white p-5"
                style={{ boxShadow: "0 20px 50px -20px color-mix(in oklab, var(--blue) 50%, transparent)" }}
              >
                {doc.qrCodeBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrImageSrc(doc.qrCodeBase64)}
                    alt={`Verification QR code for your ${label(doc)}`}
                    className="h-auto w-full max-w-60"
                  />
                ) : (
                  <div className="grid h-60 w-60 max-w-full place-items-center text-xs text-neutral-500">
                    QR not generated yet
                  </div>
                )}
              </div>
              <p className="mt-5 text-lg font-bold capitalize">{label(doc)}</p>
              <p className="tabular mt-3 font-mono text-lg font-semibold tracking-wider break-all">
                {doc.verificationToken}
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-success">
                <ShieldCheck className="h-4 w-4" />
                Cryptographically signed
                {doc.signedAt ? ` · ${new Date(doc.signedAt).toLocaleDateString()}` : ""}
              </p>
            </GlassCard>

            <GlassCard className="flex flex-col gap-4 self-start p-6">
              <h2 className="text-base font-bold">Share link</h2>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-muted/60 p-2 pl-4">
                <span className="tabular truncate font-mono text-sm">{url}</span>
                <Button variant="ghost" size="icon" aria-label="Copy link" onClick={copy}>
                  {copied ? <Check className="text-success" /> : <Copy />}
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {doc.qrCodeBase64 && (
                  <Button variant="hero" size="lg" asChild>
                    <a href={qrImageSrc(doc.qrCodeBase64)} download={`votta-${doc.verificationToken}.png`}>
                      <Download /> Download QR
                    </a>
                  </Button>
                )}
                {canShare && (
                  <Button
                    variant="glass"
                    size="lg"
                    onClick={() => navigator.share({ title: `Verify my ${label(doc)}`, url }).catch(() => {})}
                  >
                    <Share2 /> Share…
                  </Button>
                )}
                <Button variant="glass" size="lg" asChild>
                  <Link href={`/verify?token=${doc.verificationToken}`}>Preview what they see</Link>
                </Button>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Every check is recorded in the institution&apos;s tamper-evident audit log. To stop
                sharing a document, ask the registry to reissue it.
              </p>
            </GlassCard>
          </div>
        </>
      )}
    </>
  );
}
