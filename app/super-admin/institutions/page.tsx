"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  UserPlus,
  Pencil,
  Building2,
  MoreHorizontal,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  apiListInstitutions,
  apiCreateInstitution,
  apiUpdateInstitution,
  apiProvisionAdmin,
  apiSuspendInstitution,
  apiReactivateInstitution,
  apiDeleteInstitution,
  type Institution,
} from "@/lib/api";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Create / Edit Institution Dialog ─────────────────────────────────────────

type InstitutionForm = {
  name: string;
  acronym: string;
  state: string;
  adminEmail: string;
};

function InstitutionDialog({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: Institution | null;
  onClose: () => void;
  onSaved: (inst: Institution) => void;
}) {
  const isEdit = !!editing;
  const [form, setForm] = useState<InstitutionForm>({
    name: "",
    acronym: "",
    state: "",
    adminEmail: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        acronym: editing.acronym,
        state: editing.state ?? "",
        adminEmail: editing.adminEmail,
      });
    } else {
      setForm({ name: "", acronym: "", state: "", adminEmail: "" });
    }
    setError(null);
    setLoading(false);
  }, [editing, open]);

  function field(key: keyof InstitutionForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        ...form,
        state: form.state || undefined,
      };
      const saved = isEdit
        ? await apiUpdateInstitution(editing!.id, payload)
        : await apiCreateInstitution(payload);
      onSaved(saved);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit institution" : "Create institution"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              Institution name <span className="text-destructive">*</span>
            </label>
            <Input
              required
              placeholder="University of Lagos"
              value={form.name}
              onChange={field("name")}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Acronym <span className="text-destructive">*</span>
              </label>
              <Input
                required
                placeholder="UNILAG"
                value={form.acronym}
                onChange={field("acronym")}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                State
              </label>
              <Input
                placeholder="Lagos"
                value={form.state}
                onChange={field("state")}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              Admin email <span className="text-destructive">*</span>
            </label>
            <Input
              required
              type="email"
              placeholder="admin@unilag.edu.ng"
              value={form.adminEmail}
              onChange={field("adminEmail")}
            />
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : isEdit ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Provision Admin Dialog ────────────────────────────────────────────────────

function ProvisionAdminDialog({
  institution,
  onClose,
}: {
  institution: Institution | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ email: "", fullName: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!institution) {
      setForm({ email: "", fullName: "" });
      setError(null);
      setSuccess(false);
      setLoading(false);
    }
  }, [institution]);

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!institution) return;
    setError(null);
    setLoading(true);
    try {
      await apiProvisionAdmin(institution.id, form);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send invite.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!institution} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate">
            Add admin — {institution?.name}
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center">
            <div className="mb-3 text-3xl">✉️</div>
            <p className="font-medium text-foreground">Invite sent!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              An invitation email has been sent to{" "}
              <strong>{form.email}</strong>. They'll click the link to set
              their password and activate their account.
            </p>
            <Button className="mt-5 w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              An invitation email will be sent to the address below. The admin
              will set their own password when they accept the invite.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Full name <span className="text-destructive">*</span>
              </label>
              <Input
                required
                placeholder="Dr. John Doe"
                value={form.fullName}
                onChange={field("fullName")}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Email address <span className="text-destructive">*</span>
              </label>
              <Input
                required
                type="email"
                placeholder="registrar@institution.edu.ng"
                value={form.email}
                onChange={field("email")}
              />
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Sending…" : "Send invite"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialogs
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Institution | null>(null);
  const [provisionTarget, setProvisionTarget] = useState<Institution | null>(
    null
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Institution | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setInstitutions(await apiListInstitutions());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSuspend(inst: Institution) {
    setActionLoading(inst.id);
    setError(null);
    try {
      const updated = await apiSuspendInstitution(inst.id);
      setInstitutions((prev) =>
        prev.map((i) => (i.id === inst.id ? { ...i, ...updated, _count: i._count } : i))
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to suspend.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReactivate(inst: Institution) {
    setActionLoading(inst.id);
    setError(null);
    try {
      const updated = await apiReactivateInstitution(inst.id);
      setInstitutions((prev) =>
        prev.map((i) => (i.id === inst.id ? { ...i, ...updated, _count: i._count } : i))
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to reactivate.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(inst: Institution) {
    setActionLoading(inst.id);
    setError(null);
    try {
      await apiDeleteInstitution(inst.id);
      setInstitutions((prev) => prev.filter((i) => i.id !== inst.id));
      setDeleteTarget(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete institution.");
    } finally {
      setActionLoading(null);
    }
  }

  function handleSaved(saved: Institution) {
    setInstitutions((prev) => {
      const idx = prev.findIndex((i) => i.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Institutions
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            All universities and schools registered on the platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Add institution
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        {loading ? (
          <div className="divide-y divide-border">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="h-9 w-9 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        ) : institutions.length === 0 && !error ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Building2 className="mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="font-medium text-foreground">
              No institutions yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add the first institution to get started.
            </p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              Add institution
            </Button>
          </div>
        ) : institutions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Institution</TableHead>
                <TableHead className="hidden sm:table-cell">State</TableHead>
                <TableHead className="text-right">Students</TableHead>
                <TableHead className="text-right">Documents</TableHead>
                <TableHead className="hidden md:table-cell">Added</TableHead>
                <TableHead className="hidden lg:table-cell">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {institutions.map((inst) => (
                <TableRow key={inst.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                        {inst.acronym.slice(0, 3)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {inst.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {inst.adminEmail}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {inst.state ? (
                      <Badge variant="outline">{inst.state}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {inst._count.students.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {inst._count.documents.toLocaleString()}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {formatDate(inst.createdAt)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {inst.isActive ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400">
                        Suspended
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={actionLoading === inst.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditTarget(inst)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setProvisionTarget(inst)}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Add admin
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {inst.isActive ? (
                          <DropdownMenuItem
                            onClick={() => handleSuspend(inst)}
                            className="text-amber-600 focus:text-amber-600"
                          >
                            <PauseCircle className="mr-2 h-4 w-4" />
                            Suspend
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleReactivate(inst)}
                            className="text-emerald-600 focus:text-emerald-600"
                          >
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Reactivate
                          </DropdownMenuItem>
                        )}
                        {!inst.isActive &&
                          inst._count.students === 0 &&
                          inst._count.documents === 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(inst)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete permanently
                              </DropdownMenuItem>
                            </>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </div>

      {/* Dialogs */}
      <InstitutionDialog
        open={showCreate || !!editTarget}
        editing={editTarget}
        onClose={() => {
          setShowCreate(false);
          setEditTarget(null);
        }}
        onSaved={handleSaved}
      />
      <ProvisionAdminDialog
        institution={provisionTarget}
        onClose={() => setProvisionTarget(null)}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete institution?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove{" "}
            <strong className="text-foreground">{deleteTarget?.name}</strong> and
            all associated data. This action cannot be undone.
          </p>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading === deleteTarget?.id}
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              {actionLoading === deleteTarget?.id ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
