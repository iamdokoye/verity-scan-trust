"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { QrCode, Camera } from "lucide-react";
import { Logo } from "@/components/votta/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { INSTITUTION } from "@/lib/mock-data";

type VerifyStatus =
  | "verified"
  | "tampered"
  | "invalid_signature"
  | "superseded"
  | "revoked"
  | "not_found";

function statusToPath(
  status: VerifyStatus
): "/verify/result" | "/verify/tampered" | "/verify/not-found" {
  if (status === "verified") return "/verify/result";
  if (status === "tampered" || status === "invalid_signature")
    return "/verify/tampered";
  return "/verify/not-found";
}

export default function VerifyHome() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleVerify() {
    const t = token.trim();
    if (!t) return;
    setLoading(true);
    try {
      const result = await api.get<{ status: VerifyStatus }>(
        `/verify?token=${encodeURIComponent(t)}`,
        { noAuth: true }
      );
      router.push(
        `${statusToPath(result.status)}?token=${encodeURIComponent(t)}&status=${result.status}`
      );
    } catch {
      router.push(`/verify/not-found?token=${encodeURIComponent(t)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
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
                <Button variant="outline" className="mt-4" size="sm">
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
        {INSTITUTION} · Powered by Votta
      </footer>
    </div>
  );
}
