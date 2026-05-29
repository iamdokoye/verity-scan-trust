"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Share2, QrCode, Copy, Check, Loader2 } from "lucide-react";
import { PageTitle } from "@/components/votta/PortalShell";
import { Button } from "@/components/ui/button";
import {
  apiGetMyStudent,
  apiGetStudentDocuments,
  type VottaDocument,
} from "@/lib/api";

const VERIFY_BASE =
  (typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? "https://votta.xyz") + "/verify?token=";

function ShareCard({ doc }: { doc: VottaDocument }) {
  const verifyUrl = `${VERIFY_BASE}${doc.verificationToken}`;
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(verifyUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="text-sm font-semibold capitalize text-foreground">
        {doc.documentType.replace(/_/g, " ")}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Token{" "}
        <span className="font-mono">
          {doc.verificationToken?.slice(0, 16)}…
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5">
        <code className="flex-1 truncate text-xs text-foreground">{verifyUrl}</code>
        <button
          onClick={copy}
          className="text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
      <div className="mt-4 flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/student/documents">
            <QrCode className="h-4 w-4" /> View QR
          </Link>
        </Button>
        <Button size="sm" onClick={copy}>
          <Share2 className="h-4 w-4" />
          {copied ? "Copied!" : "Copy link"}
        </Button>
      </div>
    </div>
  );
}

export default function SharePage() {
  const [docs, setDocs] = useState<VottaDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div>
      <PageTitle title="Share Credentials" />
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        Generate a one-tap verification link for any of your approved documents.
        Recipients can verify instantly without an account.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-base font-medium text-foreground">
            No shareable documents yet
          </p>
          <p className="text-sm text-muted-foreground">
            Documents must be approved by your institution before they can be
            shared.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {docs.map((d) => (
            <ShareCard key={d.id} doc={d} />
          ))}
        </div>
      )}
    </div>
  );
}
