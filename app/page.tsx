"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import {
  QrCode,
  Camera,
  Loader2,
  ShieldCheck,
  Lock,
  Building2,
  GraduationCap,
  UploadCloud,
  FileCheck2,
  ScanLine,
  ArrowRight,
} from "lucide-react";
import { Logo } from "@/components/votta/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import {
  cacheVerifyResult,
  type VerifyResult,
  type VerifyStatus,
} from "@/lib/verify-cache";

function statusToPath(
  status: VerifyStatus
): "/verify/result" | "/verify/tampered" | "/verify/not-found" {
  if (status === "verified") return "/verify/result";
  if (status === "tampered" || status === "invalid_signature")
    return "/verify/tampered";
  return "/verify/not-found";
}

function extractVerificationToken(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed, window.location.origin);
    const token = parsed.searchParams.get("token");
    if (token) return token;

    const pathToken = parsed.pathname.split("/").filter(Boolean).at(-1);
    return pathToken ?? trimmed;
  } catch {
    return trimmed;
  }
}

export default function VerifyHome() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);
  const router = useRouter();

  async function verifyToken(value: string) {
    const t = value.trim();
    if (!t) return;
    setLoading(true);
    try {
      const result = await api.get<VerifyResult>(
        `/verify?token=${encodeURIComponent(t)}`,
        { noAuth: true }
      );
      cacheVerifyResult(t, result);
      const reason = result.reason
        ? `&reason=${encodeURIComponent(result.reason)}`
        : "";
      router.push(
        `${statusToPath(result.status)}?token=${encodeURIComponent(t)}&status=${result.status}${reason}`
      );
    } catch {
      router.push(`/verify/not-found?token=${encodeURIComponent(t)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    await verifyToken(token);
  }

  useEffect(() => {
    if (!scannerOpen) return;

    let cancelled = false;

    async function startScanner() {
      setScannerLoading(true);
      setScannerError(null);
      scannedRef.current = false;

      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode("votta-qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          async (decodedText) => {
            if (scannedRef.current) return;
            const scannedToken = extractVerificationToken(decodedText);
            if (!scannedToken) return;

            scannedRef.current = true;
            setToken(scannedToken);
            setScannerOpen(false);
            await verifyToken(scannedToken);
          },
          undefined
        );

        if (cancelled && scanner.isScanning) {
          await scanner.stop().catch(() => {});
        }
      } catch (err) {
        if (!cancelled) {
          setScannerError(
            err instanceof Error
              ? err.message
              : "Camera access failed. Enter the token manually instead."
          );
        }
      } finally {
        if (!cancelled) setScannerLoading(false);
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner?.isScanning) {
        scanner.stop().catch(() => {});
      }
    };
  }, [scannerOpen]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Navbar ── */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link href="/signup">
              <Button size="sm">
                Sign up
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="mx-auto w-full max-w-3xl px-4 pb-10 pt-16 text-center sm:pt-20">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-secondary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Institution-issued, cryptographically signed
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Verify any academic credential in seconds.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Every Votta document is hashed, digitally signed by the issuing
            institution, and checked live — no account, no waiting, no
            benefit of the doubt.
          </p>
        </section>

        {/* ── Verify widget ── */}
        <section className="mx-auto w-full max-w-3xl px-4 pb-16">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6">
              <div className="mb-3 text-sm font-medium text-foreground">
                Scan QR Code
              </div>
              <div className="flex aspect-square w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/40 p-6 text-center">
                <Camera className="h-10 w-10 text-muted-foreground" />
                <div className="mt-3 text-sm font-medium text-foreground">
                  Scan QR Code
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Point your camera at the code on the document.
                </div>
                <Button
                  variant="outline"
                  className="mt-4"
                  size="sm"
                  onClick={() => setScannerOpen(true)}
                  disabled={loading}
                >
                  <QrCode className="h-4 w-4" /> Open scanner
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <div className="mb-3 text-sm font-medium text-foreground">
                Enter Verification Token
              </div>
              <label className="mb-2 block text-xs text-muted-foreground">
                Verification token
              </label>
              <Input
                placeholder="e.g. 7K3M9P2Q"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="font-mono"
              />
              <Button
                className="mt-4 w-full"
                size="lg"
                onClick={handleVerify}
                disabled={loading || !token.trim()}
              >
                {loading ? "Verifying…" : "Verify"}
              </Button>
              <div className="mt-3 text-center text-xs text-muted-foreground">
                Try sample tokens:{" "}
                <Link
                  href="/verify/result"
                  className="text-secondary hover:underline"
                >
                  verified
                </Link>
                {" · "}
                <Link
                  href="/verify/tampered"
                  className="text-secondary hover:underline"
                >
                  tampered
                </Link>
                {" · "}
                <Link
                  href="/verify/not-found"
                  className="text-secondary hover:underline"
                >
                  not found
                </Link>
              </div>
            </Card>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Need access to your records?{" "}
            <Link href="/student" className="text-secondary hover:underline">
              Student portal
            </Link>
            {" · "}
            <Link href="/admin" className="text-secondary hover:underline">
              Administration
            </Link>
          </p>
        </section>

        {/* ── Trust strip ── */}
        <section className="border-y border-border bg-muted/30 py-12">
          <div className="mx-auto grid max-w-4xl gap-8 px-4 text-center sm:grid-cols-3">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                <Lock className="h-5 w-5" />
              </div>
              <div className="text-sm font-semibold text-foreground">
                SHA-256 + RSA signed
              </div>
              <p className="max-w-[220px] text-xs text-muted-foreground">
                Every document is hashed and signed at the point of issue —
                any edit invalidates the signature.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                <ScanLine className="h-5 w-5" />
              </div>
              <div className="text-sm font-semibold text-foreground">
                Instant, public verification
              </div>
              <p className="max-w-[220px] text-xs text-muted-foreground">
                Anyone can check a document&apos;s authenticity in seconds —
                no account or approval required.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="text-sm font-semibold text-foreground">
                Issued by the institution
              </div>
              <p className="max-w-[220px] text-xs text-muted-foreground">
                Records come straight from the awarding institution, not a
                third party or the student.
              </p>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="mx-auto w-full max-w-4xl px-4 py-16">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              How verification works
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              From issuance to verification, in three steps.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: UploadCloud,
                step: "1",
                title: "Institution issues the document",
                body: "The registrar uploads a transcript or certificate, which Votta hashes and signs with the institution's private key.",
              },
              {
                icon: FileCheck2,
                step: "2",
                title: "A QR code and token are embedded",
                body: "Each signed document gets a unique verification token and QR code tied to its exact content.",
              },
              {
                icon: ShieldCheck,
                step: "3",
                title: "Anyone can verify instantly",
                body: "Scan the code or enter the token here to confirm the document is genuine and unaltered — publicly, with no login.",
              },
            ].map(({ icon: Icon, step, title, body }) => (
              <Card key={step} className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Step {step}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* ── CTA band ── */}
        <section className="border-t border-border bg-primary py-14 text-primary-foreground">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <div className="text-base font-semibold">
                  A student wanting access to your records?
                </div>
                <p className="mt-0.5 text-sm text-primary-foreground/80">
                  Sign up to download, share and QR-share your approved documents.
                </p>
              </div>
            </div>
            <Link href="/signup" className="flex-shrink-0">
              <Button variant="secondary" size="lg">
                Create a student account <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
        Votta · Tamper-evident academic verification
      </footer>
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan verification QR</DialogTitle>
            <DialogDescription>
              Allow camera access and place the credential QR code inside the frame.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-md border border-border bg-muted">
            <div id="votta-qr-reader" className="min-h-72 w-full" />
          </div>
          {scannerLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting camera…
            </div>
          )}
          {scannerError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {scannerError}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
