"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-client";
import { apiLogin } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Loader2 } from "lucide-react";

// ── Logo ──────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <ShieldCheck className="h-6 w-6 text-primary" />
      <span className="text-lg font-bold tracking-tight text-foreground">
        Votta
      </span>
    </div>
  );
}

// ── Inner component (uses useSearchParams — must be inside Suspense) ───────────

function AcceptInviteInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  type Step = "verifying" | "set-password" | "done" | "error";
  const [step, setStep] = useState<Step>("verifying");
  const [pageError, setPageError] = useState<string | null>(null);

  // Password form
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Exchange the invite token as soon as the page loads
  useEffect(() => {
    async function verifyInvite() {
      let supabaseBrowser: ReturnType<typeof getSupabaseBrowser>;
      try {
        supabaseBrowser = getSupabaseBrowser();
      } catch (error) {
        setPageError(error instanceof Error ? error.message : "Invite flow is not configured.");
        setStep("error");
        return;
      }

      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      if (tokenHash && type === "invite") {
        // PKCE / token_hash flow (default for newer Supabase projects)
        const { data, error } = await supabaseBrowser.auth.verifyOtp({
          token_hash: tokenHash,
          type: "invite",
        });
        if (error) {
          setPageError(error.message);
          setStep("error");
          return;
        }
        setEmail(data.user?.email ?? "");
        setStep("set-password");
        return;
      }

      // Implicit / hash flow — access_token arrives in the URL fragment.
      // Next.js doesn't expose window.location.hash server-side, so we read
      // it only after mount.
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash.replace("#", ""));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token") ?? "";
        if (accessToken) {
          const { data, error } = await supabaseBrowser.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            setPageError(error.message);
            setStep("error");
            return;
          }
          setEmail(data.user?.email ?? "");
          setStep("set-password");
          return;
        }
      }

      setPageError(
        "Invalid or expired invite link. Please ask your administrator to resend the invitation."
      );
      setStep("error");
    }

    verifyInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If auth context already loaded a user (shouldn't happen normally), redirect
  useEffect(() => {
    if (user) {
      const dest =
        user.role === "super_admin"
          ? "/super-admin"
          : user.role === "admin"
          ? "/admin"
          : "/student";
      router.replace(dest);
    }
  }, [user, router]);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (password !== confirm) {
      setFormError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const supabaseBrowser = getSupabaseBrowser();
      // 1. Update password in Supabase
      const { error: updateError } = await supabaseBrowser.auth.updateUser({
        password,
      });
      if (updateError) throw new Error(updateError.message);

      // 2. Sign out of Supabase session (our app uses its own JWT via backend)
      await supabaseBrowser.auth.signOut();

      // 3. Log in through our backend to get the Votta JWT
      await apiLogin(email, password);

      setStep("done");
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Failed to set password."
      );
      setLoading(false);
    }
  }

  // After "done", redirect to the right portal
  useEffect(() => {
    if (step === "done") {
      const timer = setTimeout(async () => {
        // Fetch the user role from our backend and redirect
        try {
          const { apiGetMe } = await import("@/lib/api");
          const me = await apiGetMe();
          const dest =
            me.role === "super_admin"
              ? "/super-admin"
              : me.role === "admin"
              ? "/admin"
              : "/student";
          router.replace(dest);
        } catch {
          router.replace("/login");
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, router]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (step === "verifying") {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verifying your invite…</p>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="text-4xl">❌</div>
        <p className="font-medium text-foreground">Invite link invalid</p>
        <p className="max-w-xs text-sm text-muted-foreground">{pageError}</p>
        <Button variant="outline" onClick={() => router.push("/login")}>
          Back to login
        </Button>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="text-4xl">✅</div>
        <p className="font-medium text-foreground">Password set!</p>
        <p className="text-sm text-muted-foreground">
          Signing you in…
        </p>
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  // step === "set-password"
  return (
    <form onSubmit={handleSetPassword} className="space-y-4">
      <div>
        <p className="mb-4 text-sm text-muted-foreground">
          You've been invited as an admin for an institution on Votta. Create a
          password to activate your account.
        </p>
        {email && (
          <p className="mb-4 rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground">
            {email}
          </p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-foreground">
          New password <span className="text-destructive">*</span>
        </label>
        <Input
          required
          type="password"
          minLength={8}
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-foreground">
          Confirm password <span className="text-destructive">*</span>
        </label>
        <Input
          required
          type="password"
          minLength={8}
          placeholder="Repeat password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {formError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {formError}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Setting password…
          </>
        ) : (
          "Activate account"
        )}
      </Button>
    </form>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function AcceptInvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <Logo />
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Set your password
          </h1>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            }
          >
            <AcceptInviteInner />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
