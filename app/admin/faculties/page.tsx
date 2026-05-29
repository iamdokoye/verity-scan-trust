"use client";

import { useCallback, useEffect, useState } from "react";
import { Landmark, Loader2, Plus } from "lucide-react";
import { PageTitle } from "@/components/votta/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  apiCreateFaculty,
  apiListFaculties,
  type Faculty,
} from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function AddFacultyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setCode("");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiCreateFaculty({
        name: name.trim(),
        code: code.trim() || undefined,
      });
      await onCreated();
      reset();
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create faculty.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Faculty</DialogTitle>
          <DialogDescription>
            Faculties group departments within the institution.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              Faculty Name
            </label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Faculty of Science"
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              Faculty Code
            </label>
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="SCI"
              maxLength={20}
            />
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create Faculty
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function FacultiesPage() {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const loadFaculties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFaculties(await apiListFaculties());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load faculties.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFaculties();
  }, [loadFaculties]);

  return (
    <div>
      <PageTitle
        title="Faculties"
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Faculty
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
          <Button variant="outline" size="sm" className="mt-4" onClick={loadFaculties}>
            Retry
          </Button>
        </div>
      ) : faculties.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Landmark className="h-10 w-10 text-muted-foreground" />
          <p className="text-base font-medium text-foreground">No faculties yet</p>
          <p className="text-sm text-muted-foreground">
            Add a faculty before creating departments.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Faculty</th>
                <th className="px-5 py-3 text-left font-medium">Code</th>
                <th className="px-5 py-3 text-center font-medium">Departments</th>
                <th className="px-5 py-3 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {faculties.map((faculty) => (
                <tr key={faculty.id} className="hover:bg-muted/30">
                  <td className="px-5 py-3 font-medium text-foreground">{faculty.name}</td>
                  <td className="px-5 py-3 font-mono text-muted-foreground">
                    {faculty.code || "-"}
                  </td>
                  <td className="px-5 py-3 text-center text-foreground">
                    {faculty._count?.departments ?? 0}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {new Date(faculty.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddFacultyDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={loadFaculties}
      />
    </div>
  );
}
