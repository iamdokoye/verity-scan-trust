"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/votta/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  apiSignup,
  apiListInstitutionsPublic,
  type PublicInstitution,
} from "@/lib/api";

type FormState = "idle" | "loading" | "success" | "error";

export default function SignupPage() {
  const [institutions, setInstitutions] = useState<PublicInstitution[]>([]);
  const [institutionId, setInstitutionId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiListInstitutionsPublic()
      .then(setInstitutions)
      .catch(() => setInstitutions([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!institutionId) {
      setError("Please select your institution.");
      return;
    }

    setFormState("loading");
    try {
      await apiSignup({ email, password, fullName, institutionId });
      setFormState("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign up failed. Please try again.";
      setError(msg);
      setFormState("error");
    }
  }

  if (formState === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <Logo />
          <div className="mt-8 rounded-lg border border-border bg-card p-6">
            <div className="mb-2 text-2xl">✉️</div>
            <h2 className="text-base font-semibold text-foreground">
              Check your email
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We&apos;ve sent a confirmation link to <strong>{email}</strong>.
              Click the link to activate your account, then sign in.
            </p>
            <Link href="/login">
              <Button className="mt-6 w-full">Go to sign in</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-4 text-xl font-semibold text-foreground">
            Create a student account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Access your academic records and share verified credentials.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Institution */}
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              Institution
            </label>
            <Select onValueChange={setInstitutionId} value={institutionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select your university or school" />
              </SelectTrigger>
              <SelectContent>
                {institutions.length === 0 ? (
                  <SelectItem value="__none__" disabled>
                    No institutions available
                  </SelectItem>
                ) : (
                  institutions.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name}
                      {inst.acronym ? ` (${inst.acronym})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Full name */}
          <div>
            <label
              htmlFor="fullName"
              className="mb-1 block text-xs font-medium text-foreground"
            >
              Full name
            </label>
            <Input
              id="fullName"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="As it appears on your documents"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-xs font-medium text-foreground"
            >
              Email address
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-xs font-medium text-foreground"
            >
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>

          {/* Confirm password */}
          <div>
            <label
              htmlFor="confirm"
              className="mb-1 block text-xs font-medium text-foreground"
            >
              Confirm password
            </label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={formState === "loading"}
          >
            {formState === "loading" ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-secondary hover:underline">
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:underline">
            Back to verification portal
          </Link>
        </p>
      </div>
    </div>
  );
}
