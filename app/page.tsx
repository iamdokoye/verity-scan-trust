"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import {
  ArrowRight,
  Camera,
  FileCheck2,
  Fingerprint,
  KeySquare,
  Loader2,
  ScanLine,
  ScrollText,
  Search,
  Share2,
  ShieldCheck,
  UploadCloud,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/votta/GlassCard";
import { SiteFooter, SiteHeader } from "@/components/votta/SiteHeader";
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

const steps = [
  {
    icon: UploadCloud,
    title: "Upload and sign",
    body: "The registry uploads a certificate or transcript. Votta hashes it with SHA-256 and signs the hash with the institution's RSA-2048 key on approval.",
  },
  {
    icon: Share2,
    title: "Share a QR or link",
    body: "Each signed record gets a verification token and QR code the graduate can share on a CV, PDF or printed certificate.",
  },
  {
    icon: UserCheck,
    title: "Verify instantly",
    body: "Anyone scans or types the token and gets a clear answer in seconds, with no account and no phone calls to the registry.",
  },
];

const security = [
  {
    icon: Fingerprint,
    title: "SHA-256 fingerprints",
    body: "Every document carries a unique fingerprint. Change one character and the check fails.",
    wide: true,
  },
  {
    icon: KeySquare,
    title: "RSA-2048 signatures",
    body: "Only the institution's private key can sign a record; the public key proves it.",
  },
  {
    icon: ScrollText,
    title: "Append-only audit log",
    body: "Every write and every verification attempt is hash-chained, so history cannot be quietly rewritten.",
  },
  {
    icon: FileCheck2,
    title: "Six clear outcomes",
    body: "Verified, Tampered, Invalid Signature, Not Found, Revoked or Superseded. Never an ambiguous answer.",
    wide: true,
  },
];

const iconTile = {
  background: "var(--gradient-primary)",
  boxShadow: "inset 0 1px 0 var(--glass-highlight)",
} as const;

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
    // Accept a pasted or scanned link (".../verify?token=ABC123") as well as
    // a bare token.
    await verifyToken(extractVerificationToken(token));
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
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2">
          <div className="animate-rise">
            <span className="glass-subtle inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-accent">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
              Institution-issued, cryptographically signed
            </span>
            <h1 className="mt-5 text-4xl leading-[1.05] font-extrabold sm:text-5xl lg:text-6xl">
              Credentials that <span className="text-gradient">cannot be faked</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Every Votta document is hashed, digitally signed by the issuing
              institution, and checked live. No account, no waiting. Change a
              single character and the check fails.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button variant="hero" size="xl" asChild>
                <Link href="#verify">
                  Verify a document
                  <ArrowRight strokeWidth={1.75} />
                </Link>
              </Button>
              <Button variant="glass" size="xl" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
            <dl className="mt-9 grid max-w-md grid-cols-3 gap-4">
              {[
                ["SHA-256", "Document hashing"],
                ["RSA-2048", "Signed records"],
                ["0 accounts", "Needed to verify"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="tabular font-display text-lg font-extrabold">{value}</dt>
                  <dd className="text-xs text-muted-foreground">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Verify panel */}
          <div className="animate-rise" style={{ animationDelay: "120ms" }}>
            <GlassCard glossy id="verify" className="scroll-mt-24 p-6 sm:p-8" aria-label="Verify a document">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-accent uppercase">
                <ScanLine className="h-4 w-4" strokeWidth={1.75} />
                Instant verification
              </div>
              <h2 className="mt-3 text-2xl sm:text-3xl">Check a document in seconds</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter the verification token or scan the QR code. No account required.
              </p>

              <form
                className="mt-5 flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerify();
                }}
              >
                <label htmlFor="token" className="sr-only">
                  Verification token
                </label>
                <div className="glass-subtle flex h-14 items-center gap-2 rounded-xl px-4">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                  <input
                    id="token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="e.g. 7K3M9P2Q"
                    autoComplete="off"
                    spellCheck={false}
                    className="tabular w-full bg-transparent font-mono text-base tracking-wider placeholder:text-muted-foreground/70 focus:outline-none"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    type="submit"
                    variant="hero"
                    size="xl"
                    disabled={loading || !token.trim()}
                  >
                    {loading ? <Loader2 className="animate-spin" /> : null}
                    {loading ? "Verifying…" : "Verify"}
                  </Button>
                  <Button
                    type="button"
                    variant="glass"
                    size="xl"
                    onClick={() => setScannerOpen(true)}
                    disabled={loading}
                  >
                    <Camera strokeWidth={1.75} />
                    Scan QR
                  </Button>
                </div>
              </form>

              <p className="mt-5 text-xs text-muted-foreground">
                Need access to your records?{" "}
                <Link href="/student" className="font-semibold text-accent hover:underline">
                  Student portal
                </Link>
                {" · "}
                <Link href="/admin" className="font-semibold text-accent hover:underline">
                  Administration
                </Link>
              </p>
            </GlassCard>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">How it works</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">Three steps from registry to recruiter</h2>
          </div>
          <ol className="relative mt-8 grid gap-5 md:grid-cols-3">
            <div
              aria-hidden
              className="absolute top-12 right-8 left-8 hidden h-px md:block"
              style={{ background: "var(--gradient-primary)", opacity: 0.35 }}
            />
            {steps.map((s, i) => (
              <li key={s.title}>
                <GlassCard className="relative h-full p-6">
                  <span
                    className="grid h-12 w-12 place-items-center rounded-2xl text-white"
                    style={iconTile}
                  >
                    <s.icon className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <span className="tabular mt-5 block font-mono text-xs text-muted-foreground">
                    Step {i + 1}
                  </span>
                  <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </GlassCard>
              </li>
            ))}
          </ol>
        </section>

        {/* Security bento */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">Security</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">Proof, not paperwork</h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {security.map((f) => (
              <GlassCard key={f.title} className={`p-6 ${f.wide ? "lg:col-span-2" : ""}`}>
                <span
                  className="grid h-11 w-11 place-items-center rounded-xl text-white"
                  style={iconTile}
                >
                  <f.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
          <GlassCard glossy tier="strong" className="grid gap-5 p-8 text-center sm:p-12">
            <h2 className="text-3xl sm:text-4xl">A student wanting access to your records?</h2>
            <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
              Sign up to view your results, and to download and share your approved documents by QR code.
            </p>
            <div className="flex justify-center">
              <Button variant="hero" size="xl" asChild>
                <Link href="/signup">
                  Create a student account
                  <ArrowRight strokeWidth={1.75} />
                </Link>
              </Button>
            </div>
          </GlassCard>
        </section>
      </main>

      <SiteFooter />

      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan verification QR</DialogTitle>
            <DialogDescription>
              Allow camera access and place the credential QR code inside the frame.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-xl border border-border bg-muted">
            <div id="votta-qr-reader" className="min-h-72 w-full" />
          </div>
          {scannerLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting camera…
            </div>
          )}
          {scannerError && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {scannerError}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
