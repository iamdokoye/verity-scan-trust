"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Loader2, Plus } from "lucide-react";
import { PageTitle } from "@/components/votta/PortalShell";
import { Button } from "@/components/ui/button";
import { apiListSessions, type AcademicSession } from "@/lib/api";

export default function ResultsAdmin() {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiListSessions()
      .then(setSessions)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load sessions.")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageTitle
        title="Results"
        action={
          <Button asChild>
            <Link href="/admin/results/new">
              <Plus className="h-4 w-4" /> Enter Results
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-base font-medium text-foreground">No sessions configured</p>
          <p className="text-sm text-muted-foreground">
            Add academic sessions before entering results.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary/10 text-secondary">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {session.label}
                  </div>
                  <div className="text-xs capitalize text-muted-foreground">
                    {session.semester} semester
                  </div>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/results/new">Enter results</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
