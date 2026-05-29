"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Loader2, Plus } from "lucide-react";
import { PageTitle } from "@/components/votta/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  apiCreateDepartment,
  apiListDepartments,
  type Department,
} from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function AddDepartmentDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [hodName, setHodName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setHodName("");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiCreateDepartment({
        name: name.trim(),
        hodName: hodName.trim() || undefined,
      });
      await onCreated();
      reset();
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create department.");
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
          <DialogTitle>Add Department</DialogTitle>
          <DialogDescription>
            Departments are used when assigning students and courses.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              Department
            </label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Department of Computer Science"
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              Faculty / HOD
            </label>
            <Input
              value={hodName}
              onChange={(event) => setHodName(event.target.value)}
              placeholder="Faculty of Science"
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
              Create Department
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDepartments(await apiListDepartments());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load departments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  return (
    <div>
      <PageTitle
        title="Departments"
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Department
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
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={loadDepartments}
          >
            Retry
          </Button>
        </div>
      ) : departments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground" />
          <p className="text-base font-medium text-foreground">
            No departments yet
          </p>
          <p className="text-sm text-muted-foreground">
            Add a department before creating students.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Department</th>
                <th className="px-5 py-3 text-left font-medium">Faculty / HOD</th>
                <th className="px-5 py-3 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {departments.map((department) => (
                <tr key={department.id} className="hover:bg-muted/30">
                  <td className="px-5 py-3 font-medium text-foreground">
                    {department.name}
                  </td>
                  <td className="px-5 py-3 text-foreground">
                    {department.hodName || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {new Date(department.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddDepartmentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={loadDepartments}
      />
    </div>
  );
}
