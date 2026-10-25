import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { TableFilters, dateRangeError, useTableFilters } from "@/components/ui/TableFilters";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { archiveStaffUser, createStaffUser, listStaffUsers, resetStaffUserPassword, restoreStaffUser, updateStaffUser, type StaffRole, type StaffUser } from "@/api/staffApi";
import type { AuthenticatedUser } from "@/lib/types";

const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: "Super Admin",
  admin: "Administrator",
  cashier: "Cashier",
  accounting: "Accounting Officer",
  auditor: "Auditor",
  registrar: "Registrar",
};

const ADMIN_CREATE_ROLES: StaffRole[] = ["cashier", "auditor", "registrar"];
const SUPER_ADMIN_CREATE_ROLES: StaffRole[] = ["admin", "cashier", "auditor", "registrar"];
const userFilterDefaults = { search: "", role: "", status: "all", sort: "name:asc", createdFrom: "", createdTo: "" };

export function LiveUsersPage({ user }: { user: AuthenticatedUser }) {
  const queryClient = useQueryClient();
  const tableFilters = useTableFilters(userFilterDefaults);
  const [archivedView, setArchivedView] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [roleChoice, setRoleChoice] = useState<StaffRole | "">("");
  const [archiveTarget, setArchiveTarget] = useState<StaffUser | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<StaffUser | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { search, role, status, sort: sortChoice, createdFrom, createdTo } = tableFilters.applied;
  const statusFilter = archivedView ? "archived" : status;
  const [sort, direction] = sortChoice.split(":") as ["name" | "created_at", "asc" | "desc"];
  const usersQuery = useQuery({ queryKey: ["staff-users", tableFilters.applied, archivedView, tableFilters.page, tableFilters.perPage], queryFn: () => listStaffUsers({ query: search.trim() || undefined, role: role as StaffRole | "", status: statusFilter === "all" ? undefined : statusFilter as "active" | "inactive" | "archived", sort, direction, dateFrom: createdFrom || undefined, dateTo: createdTo || undefined, page: tableFilters.page, perPage: tableFilters.perPage }) });
  const refreshUsers = () => queryClient.invalidateQueries({ queryKey: ["staff-users"] });
  const createMutation = useMutation({
    mutationFn: createStaffUser,
    onSuccess: async (result) => {
      setCreatedPassword(result.temporaryPassword);
      await refreshUsers();
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateStaffUser>[1] }) => updateStaffUser(id, patch),
    onSuccess: async (updatedUser) => {
      setEditing(updatedUser);
      setErrorMessage("");
      await refreshUsers();
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });
  const resetMutation = useMutation({
    mutationFn: resetStaffUserPassword,
    onSuccess: async (result) => {
      setEditing(result.user);
      setResetPassword(result.temporaryPassword);
      await refreshUsers();
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });
  const archiveMutation = useMutation({ mutationFn: archiveStaffUser, onSuccess: async () => { setArchiveTarget(null); setErrorMessage(""); await refreshUsers(); }, onError: (error: Error) => setErrorMessage(error.message) });
  const restoreMutation = useMutation({ mutationFn: restoreStaffUser, onSuccess: async () => { setRestoreTarget(null); setErrorMessage(""); await refreshUsers(); }, onError: (error: Error) => setErrorMessage(error.message) });

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setErrorMessage("");
    createMutation.mutate({
      username: String(form.get("username") ?? "").trim(),
      full_name: String(form.get("fullName") ?? "").trim(),
      email: String(form.get("email") ?? "").trim() || undefined,
      role: String(form.get("role") ?? "cashier") as StaffRole,
    });
  }

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    setErrorMessage("");
    updateMutation.mutate({
      id: editing.id,
      patch: {
        full_name: String(form.get("fullName") ?? "").trim(),
        email: String(form.get("email") ?? "").trim() || undefined,
        role: String(form.get("role") ?? editing.role) as StaffRole,
      },
    });
  }

  if (usersQuery.isPending) return <LoadingState message="Loading user accounts…" />;
  if (usersQuery.isError) return <ErrorState message={usersQuery.error.message} onRetry={() => void usersQuery.refetch()} />;

  return (
    <>
      <PageHeading onCreate={() => { setCreatedPassword(null); setCreateOpen(true); }} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="User account view" className="flex gap-2">
          <Button type="button" role="tab" aria-selected={!archivedView} variant={archivedView ? "secondary" : "primary"} onClick={() => { setArchivedView(false); tableFilters.setPage(1); }}>Current users</Button>
          <Button type="button" role="tab" aria-selected={archivedView} variant={archivedView ? "primary" : "secondary"} onClick={() => { setArchivedView(true); tableFilters.remove("status"); }}>Archived users</Button>
        </div>
      </div>
      <TableFilters scope="Users" defaults={userFilterDefaults} draft={tableFilters.draft} applied={tableFilters.applied} search={{ key: "search", label: "Search users", placeholder: "Search name or username" }} fields={[
        { key: "role", label: "Filter users by role", type: "select", options: [{ value: "", label: "All roles" }, ...Object.entries(ROLE_LABELS).filter(([role]) => role !== "super_admin" || user.role === "super_admin").map(([role, label]) => ({ value: role, label }))] },
        ...(statusFilter === "archived" ? [] : [{ key: "status" as const, label: "Filter users by status", type: "select" as const, options: [{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] }]),
        { key: "sort", label: "Sort users by", type: "select", options: [{ value: "name:asc", label: "Name A–Z" }, { value: "name:desc", label: "Name Z–A" }, { value: "created_at:desc", label: "Recently created" }, { value: "created_at:asc", label: "Oldest created" }] },
        { key: "createdFrom", label: "Users created from", type: "date" }, { key: "createdTo", label: "Users created to", type: "date" },
      ]} onChange={tableFilters.update} onSearch={tableFilters.search} onApply={tableFilters.apply} onReset={tableFilters.reset} onClear={tableFilters.clear} onRemove={tableFilters.remove} validate={(draft) => dateRangeError(draft.createdFrom, draft.createdTo)} />
      {errorMessage && <p role="alert" className="mb-4 rounded-md border border-status-error bg-white p-3 text-sm text-status-error">{errorMessage}</p>}
      {usersQuery.data.data.length === 0 ? (
        <Card><EmptyState message={search ? "No users match that search." : statusFilter === "archived" ? "No archived user accounts are available." : "No user accounts are available."} /></Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead><tr className="border-b bg-surface text-xs uppercase text-text-secondary">
                <th scope="col" className="px-4 py-3">Name</th><th scope="col" className="px-4 py-3">Username</th><th scope="col" className="px-4 py-3">Role</th>{statusFilter === "archived" ? <><th scope="col" className="px-4 py-3">Archived</th><th scope="col" className="px-4 py-3">Scheduled anonymization</th><th scope="col" className="px-4 py-3">Archived by</th></> : <th scope="col" className="px-4 py-3">Last sign-in</th>}<th scope="col" className="px-4 py-3">State</th><th scope="col" className="px-4 py-3">Actions</th>
              </tr></thead>
              <tbody>{usersQuery.data.data.map((item) => <tr key={item.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{item.fullName}</td><td className="px-4 py-3 font-mono">{item.username}</td><td className="px-4 py-3">{ROLE_LABELS[item.role]}{item.isProtected && <span className="ml-2 rounded bg-surface px-2 py-1 text-xs">Protected</span>}</td>{statusFilter === "archived" ? <><td className="px-4 py-3">{formatTimestamp(item.archivedAt)}</td><td className="px-4 py-3">{formatDate(item.anonymizeAt)}</td><td className="px-4 py-3">{item.archivedBy ?? "Unavailable"}</td></> : <td className="px-4 py-3">{item.lastLoginAt ? formatTimestamp(item.lastLoginAt) : "Never"}</td>}<td className="px-4 py-3"><StatusBadge status={item.archivedAt ? "Archived" : item.active ? "Active" : "Inactive"} /></td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-2">{statusFilter === "archived" ? <Button type="button" variant="secondary" size="sm" disabled={item.isProtected || restoreMutation.isPending || !item.anonymizeAt || new Date(item.anonymizeAt).getTime() <= Date.now()} onClick={() => setRestoreTarget(item)}>Restore</Button> : <><Button type="button" variant="secondary" size="sm" disabled={item.isProtected} onClick={() => { setEditing(item); setRoleChoice(item.role); setResetPassword(null); setErrorMessage(""); }}>Edit</Button><Button type="button" variant="secondary" size="sm" disabled={item.isProtected || resetMutation.isPending} onClick={() => { setEditing(item); setRoleChoice(item.role); setResetPassword(null); resetMutation.mutate(item.id); }}>{resetMutation.isPending ? "Resetting…" : "Reset password"}</Button><Button type="button" variant="secondary" size="sm" disabled={item.isProtected || archiveMutation.isPending || item.id === user.id} onClick={() => setArchiveTarget(item)}>Archive</Button></>}</div></td>
              </tr>)}</tbody>
            </table>
          </div>
          <PaginationControls currentPage={usersQuery.data.currentPage} lastPage={usersQuery.data.lastPage} perPage={usersQuery.data.perPage} total={usersQuery.data.total} label="accounts" busy={usersQuery.isFetching} onPageChange={tableFilters.setPage} onPerPageChange={tableFilters.changePerPage} />
        </Card>
      )}
      <Card className="mt-5"><p className="text-sm text-text-secondary">Temporary passwords are shown once. Administrators cannot deactivate themselves or the last active Administrator.</p></Card>

      <Dialog.Root open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) { setCreatedPassword(null); setErrorMessage(""); } }}>
        <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold">Create user</Dialog.Title>
          {createdPassword ? <><p role="status" className="mt-4 text-sm text-status-success">Account created. Give this temporary password to the user securely; it will not be shown again.</p><p className="mt-3 rounded-md bg-surface p-3 font-mono">{createdPassword}</p><div className="mt-5 flex justify-end"><Button onClick={() => setCreateOpen(false)}>Done</Button></div></> : <form className="mt-4 space-y-4" onSubmit={submitCreate}>
            <label className="block text-sm font-medium">Full name <span aria-hidden="true" className="text-status-error">*</span><input name="fullName" required maxLength={255} className={inputClass} /></label>
            <label className="block text-sm font-medium">Username <span aria-hidden="true" className="text-status-error">*</span><input name="username" required maxLength={100} className={inputClass} autoCapitalize="none" /></label>
            <label className="block text-sm font-medium">Email, if available<input name="email" type="email" className={inputClass} /></label>
            <label className="block text-sm font-medium">Role<select name="role" className={inputClass} defaultValue={user.role === "super_admin" ? "admin" : "cashier"}>{(user.role === "super_admin" ? SUPER_ADMIN_CREATE_ROLES : ADMIN_CREATE_ROLES).map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></label>
            <p className="text-xs text-text-secondary">Accounting Officer assignment remains restricted pending the approved access policy. Only Super Admin can create an Administrator account; no user can create a Super Admin from this screen.</p>
            <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button disabled={createMutation.isPending}>{createMutation.isPending ? "Creating…" : "Create user"}</Button></div>
          </form>}
        </Dialog.Content></Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={editing !== null} onOpenChange={(open) => { if (!open) { setEditing(null); setResetPassword(null); setRoleChoice(""); setErrorMessage(""); } }}>
        <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[min(600px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-border bg-white shadow-xl">
          <div className="border-b border-border p-6"><Dialog.Title className="text-lg font-semibold">Manage user account</Dialog.Title><Dialog.Description className="mt-1 text-sm text-text-secondary">Review the account details and access before saving.</Dialog.Description></div>
          {editing && <>
            <form className="flex min-h-0 flex-col" onSubmit={submitEdit}>
              <div className="flex-1 space-y-5 overflow-y-auto p-6">
                {errorMessage && <p role="alert" className="rounded-md border border-status-error p-3 text-sm text-status-error">{errorMessage}</p>}
                <section aria-labelledby="edit-account-heading"><h3 id="edit-account-heading" className="font-semibold">Account information</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Full name<input key={`${editing.id}-name`} name="fullName" required maxLength={255} defaultValue={editing.fullName} className={inputClass} /></label><label className="block text-sm font-medium">Email<input key={`${editing.id}-email`} name="email" type="email" defaultValue={editing.email ?? ""} className={inputClass} /></label></div></section>
                <section aria-labelledby="edit-role-heading" className="border-t border-border pt-4"><h3 id="edit-role-heading" className="font-semibold">Role and access</h3><label className="mt-3 block text-sm font-medium">Role<select key={`${editing.id}-role`} name="role" value={roleChoice || editing.role} onChange={(event) => setRoleChoice(event.target.value as StaffRole)} className={inputClass}>{Object.entries(ROLE_LABELS).filter(([role]) => role !== "super_admin" && (role !== "accounting" || editing.role === "accounting") && (user.role === "super_admin" || role !== "admin" || editing.role === "admin")).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select></label>{roleChoice && roleChoice !== editing.role && <p role="status" className="mt-3 rounded-md border border-status-warning bg-surface p-3 text-sm text-text-primary">Changing this role changes the account's access to EducatraK. Confirm the new responsibilities before saving.</p>}</section>
                <section aria-labelledby="edit-status-heading" className="border-t border-border pt-4"><h3 id="edit-status-heading" className="font-semibold">Account status</h3><div className="mt-3 flex flex-wrap items-center gap-3"><StatusBadge status={editing.archivedAt ? "Archived" : editing.active ? "Active" : "Inactive"} />{editing.mustChangePassword && <p className="text-sm text-status-warning">Password change required at next sign-in.</p>}</div></section>
              </div>
              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-white p-4"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={updateMutation.isPending || resetMutation.isPending}>{updateMutation.isPending ? "Saving changes…" : "Save changes"}</Button></div>
            </form>
            <div className="mt-5 border-t border-border pt-4">
              {resetPassword ? <><p role="status" className="text-sm text-status-success">Temporary password (shown once):</p><p className="mt-2 rounded-md bg-surface p-3 font-mono">{resetPassword}</p></> : <Button type="button" variant="secondary" disabled={resetMutation.isPending} onClick={() => { setErrorMessage(""); resetMutation.mutate(editing.id); }}>{resetMutation.isPending ? "Resetting…" : "Reset password"}</Button>}
              <Button type="button" variant={editing.active ? "destructive" : "secondary"} className="ml-2" disabled={updateMutation.isPending || (editing.active && editing.id === user.id)} onClick={() => setStatusConfirmOpen(true)}>{editing.active ? "Deactivate account" : "Reactivate account"}</Button>
              {editing.id === user.id && editing.active && <p className="mt-2 text-xs text-text-secondary">You cannot deactivate your own account.</p>}
            </div>
          </>}
        </Dialog.Content></Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
        <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40" /><Dialog.Content className="fixed left-1/2 top-1/2 z-[61] w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold">{editing?.active ? "Deactivate account?" : "Reactivate account?"}</Dialog.Title>
          <p className="mt-3 text-sm text-text-secondary">{editing?.active ? `${editing.fullName} will no longer be able to sign in. Account history will remain available.` : `${editing?.fullName} will be able to sign in again.`}</p>
          <div className="mt-5 flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setStatusConfirmOpen(false)}>Cancel</Button><Button type="button" variant={editing?.active ? "destructive" : "primary"} disabled={!editing || updateMutation.isPending} onClick={() => { if (!editing) return; updateMutation.mutate({ id: editing.id, patch: { active: !editing.active } }); setStatusConfirmOpen(false); }}>{editing?.active ? "Deactivate" : "Reactivate"}</Button></div>
        </Dialog.Content></Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={archiveTarget !== null} onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}>
        <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[70] bg-black/40" /><Dialog.Content className="fixed left-1/2 top-1/2 z-[71] w-[min(460px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold">Archive account?</Dialog.Title>
          <p className="mt-3 text-sm text-text-secondary">{archiveTarget?.fullName} will lose sign-in access immediately. The account can be restored for 30 days, then its identifying details will be anonymized while linked financial and audit records remain.</p>
          {errorMessage && <p role="alert" className="mt-3 text-sm text-status-error">{errorMessage}</p>}
          <div className="mt-5 flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setArchiveTarget(null)}>Cancel</Button><Button type="button" variant="destructive" disabled={!archiveTarget || archiveMutation.isPending} onClick={() => archiveTarget && archiveMutation.mutate(archiveTarget.id)}>{archiveMutation.isPending ? "Archiving…" : "Archive account"}</Button></div>
        </Dialog.Content></Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={restoreTarget !== null} onOpenChange={(open) => { if (!open) setRestoreTarget(null); }}>
        <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[70] bg-black/40" /><Dialog.Content className="fixed left-1/2 top-1/2 z-[71] w-[min(460px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold">Restore account?</Dialog.Title>
          <p className="mt-3 text-sm text-text-secondary">{restoreTarget?.fullName} will be reactivated and can sign in again. Restore is available until {formatDate(restoreTarget?.anonymizeAt)}.</p>
          {errorMessage && <p role="alert" className="mt-3 text-sm text-status-error">{errorMessage}</p>}
          <div className="mt-5 flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setRestoreTarget(null)}>Cancel</Button><Button type="button" disabled={!restoreTarget || restoreMutation.isPending} onClick={() => restoreTarget && restoreMutation.mutate(restoreTarget.id)}>{restoreMutation.isPending ? "Restoring…" : "Restore account"}</Button></div>
        </Dialog.Content></Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function PageHeading({ onCreate }: { onCreate: () => void }) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-xl font-semibold">Users</h1><p className="mt-1 text-sm text-text-secondary">Manage staff accounts and review their access status.</p></div><Button onClick={onCreate}>Create user</Button></div>;
}
const inputClass = "mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-green-dark";

function formatDate(value: string | null | undefined): string {
  return value ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(new Date(value)) : "Unavailable";
}

function formatTimestamp(value: string | null | undefined): string {
  return value ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value)) : "Unavailable";
}
