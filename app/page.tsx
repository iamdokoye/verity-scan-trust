"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { QrCode, Camera, Loader2 } from "lucide-react";
import { Logo } from "@/components/votta/Logo";
import { Button } from "@/components/ui/button";
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

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl">
          <div className="mb-10 flex flex-col items-center text-center">
            <Logo />
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Verify any academic credential instantly.
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Scan a QR code from a Votta-issued document, or enter the
              verification token printed on it.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-6">
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
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-3 text-sm font-medium text-foreground">
                Enter Verification Token
              </div>
              <label className="mb-2 block text-xs text-muted-foreground">
                Verification token
              </label>
              <Input
                placeholder="e.g. VTA-7K3M-9P2Q-XR4N"
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
            </div>
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
        </div>
      </main>
      <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
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
