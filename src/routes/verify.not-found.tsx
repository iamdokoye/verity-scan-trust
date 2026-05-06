import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FileQuestion } from "lucide-react";
import { Logo } from "@/components/votta/Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verify/not-found")({
  validateSearch: (s: Record<string, unknown>) => ({ token: (s.token as string) || "" }),
  component: NotFoundResult,
});

function NotFoundResult() {
  const { token } = Route.useSearch();
  const [value, setValue] = useState(token || "VTA-XXXX-XXXX-XXXX");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo />
          <Link to="/" className="text-xs text-secondary hover:underline">
            Verify another document
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FileQuestion className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">No Record Found.</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          The token you entered does not match any document in our system.
          Please check the token and try again.
        </p>

        <div className="mx-auto mt-8 max-w-md text-left">
          <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
            Verification token
          </label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="font-mono"
          />
          <Button
            className="mt-4 w-full"
            onClick={() =>
              navigate({
                to: value.trim().toUpperCase().startsWith("VTA-7K3M")
                  ? "/verify/result"
                  : "/verify/not-found",
                search: { token: value },
              })
            }
          >
            Try again
          </Button>
        </div>

        <p className="mx-auto mt-8 max-w-md text-xs text-muted-foreground">
          If you received this link from a student, ask them to share it again from their Votta portal.
        </p>
      </main>
    </div>
  );
}
