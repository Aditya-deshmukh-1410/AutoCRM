import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { LoaderCircle, Pencil, Plus, Search, UserCog, X } from "lucide-react";
import Field from "../components/Field";
import { Button } from "../components/ui/button";
import { FeedbackMessage, SuccessToast } from "../components/Feedback";
import { handleUnauthorizedResponse } from "../lib/unauthorized";
import PageHeader from "../components/PageHeader";

type UserRole = "ADMIN" | "SALES";
type AppUser = { userId: number; name: string; email: string; role: string; tenantId: number | null };
type UserForm = { name: string; email: string; password: string; confirmPassword: string; role: UserRole | "" };
type RequestOptions = { method?: "GET" | "POST" | "PUT"; body?: string };

const API_BASE_URL = "";
const EMPTY_FORM: UserForm = { name: "", email: "", password: "", confirmPassword: "", role: "SALES" };

async function userRequest<T>(path: string, token: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: { Authorization: `Bearer ${token}`, ...(options.body ? { "Content-Type": "application/json" } : {}) },
    body: options.body,
  });
  if (handleUnauthorizedResponse(response)) {
    throw new Error("Your session has expired. Please log in again.");
  }
  const text = await response.text();
  let payload: unknown = text;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  if (!response.ok) {
    const body = payload as { error?: unknown } | string | null;
    const message = typeof body === "object" && body !== null && typeof body.error === "string"
      ? body.error
      : typeof body === "string" && body.trim() ? body : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

function getStoredRole() {
  try {
    const storedUser: unknown = JSON.parse(localStorage.getItem("autocrm_user") ?? "null");
    return typeof storedUser === "object" && storedUser !== null && "role" in storedUser && typeof storedUser.role === "string"
      ? storedUser.role.toUpperCase()
      : "";
  } catch { return ""; }
}

export default function Users() {
  const role = getStoredRole();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const refreshAfterCreate = useRef(false);

  useEffect(() => {
    if (role !== "ADMIN") return;
    let active = true;
    const createdUserRefresh = refreshAfterCreate.current;
    refreshAfterCreate.current = false;

    const loadUsers = async () => {
      try {
        const token = localStorage.getItem("autocrm_token");
        if (!token) throw new Error("Your session has expired. Please log in again.");
        const data = await userRequest<AppUser[]>("/api/users", token);
        if (!Array.isArray(data)) throw new Error("The user list response was not valid.");
        if (active) {
          setUsers(data);
          setLoadError("");
        }
      } catch (loadError) {
        if (active) {
          setLoadError(createdUserRefresh
            ? "The user was created successfully, but the user list could not be refreshed. Retry loading the list."
            : loadError instanceof Error ? loadError.message : "Failed to load users.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadUsers();
    return () => { active = false; };
  }, [role, loadAttempt]);

  const retryLoadUsers = () => {
    setLoadError("");
    setLoading(true);
    refreshAfterCreate.current = false;
    setLoadAttempt((current) => current + 1);
  };

  const filteredUsers = useMemo(() => users.filter((user) => [user.name, user.email, user.role, user.userId].join(" ").toLowerCase().includes(search.trim().toLowerCase())), [users, search]);

  const openCreateForm = () => { setError(""); setNotice(""); setEditingId(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEditForm = async (userId: number) => {
    setError(""); setNotice(""); setEditingId(userId); setFormOpen(true); setFormLoading(true);
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const user = await userRequest<AppUser>(`/api/users/${userId}`, token);
      setForm({ name: user.name, email: user.email, password: "", confirmPassword: "", role: user.role === "ADMIN" || user.role === "SALES" ? user.role : "" });
    } catch (editError) {
      setFormOpen(false); setError(editError instanceof Error ? editError.message : "Failed to load user.");
    } finally { setFormLoading(false); }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setNotice("");
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const body = JSON.stringify({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role });
      if (editingId === null) {
        const result = await userRequest<string>("/api/users", token, { method: "POST", body });
        setNotice(typeof result === "string" && result ? result : "User created successfully.");
        refreshAfterCreate.current = true;
        setLoadError("");
        setLoading(true);
        setLoadAttempt((current) => current + 1);
      } else {
        const result = await userRequest<string>(`/api/users/${editingId}`, token, { method: "PUT", body });
        setUsers((current) => current.map((user) => user.userId === editingId ? { ...user, name: form.name.trim(), email: form.email.trim(), role: form.role } : user));
        setNotice(typeof result === "string" && result ? result : "User updated successfully.");
      }
      setFormOpen(false); setForm(EMPTY_FORM); setEditingId(null);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Failed to save user."); }
    finally { setSaving(false); }
  };

  if (role !== "ADMIN") return <Navigate to="/dashboard" replace />;

  return (
    <main className="crm-management-page bg-background text-foreground">
      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
        <PageHeader title="Users & roles" description="Manage dealership accounts and assign the existing ADMIN or SALES roles." actions={<Button onClick={openCreateForm} size="lg" className="h-11 w-fit rounded-lg bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700"><Plus size={17} /> Add User</Button>} />
        <section className="overflow-hidden rounded-xl border border-brand-600/15 bg-white shadow-[0_8px_28px_-24px_rgba(58,6,64,0.45)]"><div className="border-b border-brand-600/10 px-4 py-4 sm:px-6"><label className="input-wrap h-10 w-full bg-[#faf8fb] sm:ml-auto sm:max-w-sm"><Search size={17} aria-hidden="true" /><span className="sr-only">Search users</span><input className="input" type="search" placeholder="Search users" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
          {error && !formOpen && <FeedbackMessage message={error} onDismiss={() => setError("")} className="mx-5 my-4 sm:mx-6" />}
          {loading ? <div role="status" className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground"><LoaderCircle size={18} className="animate-spin text-brand-600" /> Loading users…</div>
            : loadError ? <div className="px-5 py-10"><FeedbackMessage message={loadError} action={{ label: "Retry", onClick: retryLoadUsers }} /></div>
              : users.length === 0 ? <div className="px-5 py-16 text-center"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600"><UserCog size={22} /></span><h3 className="mt-4 font-display text-lg font-bold text-plum-950">No users found</h3><p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Create a dealership ADMIN or SALES account to get started.</p><Button onClick={openCreateForm} className="mt-5 rounded-lg bg-brand-600 font-semibold text-white hover:bg-brand-700"><Plus size={16} /> Add User</Button></div>
                : filteredUsers.length === 0 ? <div className="px-5 py-14 text-center"><h3 className="font-display text-lg font-bold text-plum-950">No matching users</h3><p className="mt-1 text-sm text-muted-foreground">Try another name, email, role, or user ID.</p></div>
                  : <><div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[720px] border-collapse text-left"><thead className="bg-[#faf7fb] text-xs font-bold uppercase tracking-[0.08em] text-brand-700"><tr><th className="px-5 py-3.5 sm:px-6">User</th><th className="px-5 py-3.5">Email</th><th className="px-5 py-3.5">Role</th><th className="px-5 py-3.5">Tenant</th><th className="px-5 py-3.5 text-right">Actions</th></tr></thead><tbody className="divide-y divide-brand-600/10 text-sm">{filteredUsers.map((user) => <tr key={user.userId} className="transition hover:bg-[#fdfafd]"><td className="px-5 py-4 sm:px-6"><p className="font-semibold text-foreground">{user.name}</p><p className="mt-0.5 text-xs text-muted-foreground">User ID {user.userId}</p></td><td className="px-5 py-4 text-ink-soft">{user.email}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${user.role === "ADMIN" ? "border-brand-300 bg-brand-50 text-brand-700" : "border-violet-200 bg-violet-50 text-violet-700"}`}>{user.role}</span></td><td className="px-5 py-4 text-ink-soft">{user.tenantId ?? "—"}</td><td className="px-5 py-4"><div className="flex justify-end"><Button variant="outline" size="icon" onClick={() => void openEditForm(user.userId)} aria-label={`Edit ${user.name}`} className="border-brand-600/20 text-brand-700 hover:bg-brand-50"><Pencil size={16} /></Button></div></td></tr>)}</tbody></table></div>
                    <div className="divide-y divide-brand-600/10 sm:hidden">{filteredUsers.map((user) => <article key={user.userId} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold text-foreground">{user.name}</h3><p className="mt-0.5 text-xs text-muted-foreground">User ID {user.userId}</p></div><Button variant="outline" size="icon" onClick={() => void openEditForm(user.userId)} aria-label={`Edit ${user.name}`} className="shrink-0 border-brand-600/20 text-brand-700 hover:bg-brand-50"><Pencil size={16} /></Button></div><dl className="mt-3 grid gap-2 text-sm"><div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Email</dt><dd className="break-all text-ink-soft">{user.email}</dd></div><div className="flex items-center justify-between"><div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Role</dt><dd className="mt-1"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${user.role === "ADMIN" ? "border-brand-300 bg-brand-50 text-brand-700" : "border-violet-200 bg-violet-50 text-violet-700"}`}>{user.role}</span></dd></div><div className="text-right"><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tenant</dt><dd className="text-ink-soft">{user.tenantId ?? "—"}</dd></div></div></dl></article>)}</div></>}
        </section>
      </div>
      {formOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#200024]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving && !formLoading) setFormOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="user-form-title" className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl sm:p-7"><div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b5b91]">Dealership account</p><h2 id="user-form-title" className="mt-1 font-display text-2xl font-extrabold text-[#32103a]">{editingId === null ? "Add user" : "Edit user"}</h2></div><Button variant="ghost" size="icon" onClick={() => setFormOpen(false)} disabled={saving || formLoading} aria-label="Close form" className="text-muted-foreground hover:bg-secondary hover:text-foreground"><X size={19} /></Button></div>{error && <FeedbackMessage message={error} onDismiss={() => setError("")} className="mb-4" />}
        {formLoading ? <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin text-[#7b3f8f]" /> Loading user…</div> : <form onSubmit={handleSubmit} className="space-y-4"><Field label="Name" required autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><Field label="Email" type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /><Field label={editingId === null ? "Initial password" : "New password"} type="password" required autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} hint={editingId === null ? "This password is sent once to the backend, which stores only its encoded form." : "The current update endpoint requires a password and replaces the user's existing password."} /><Field label="Confirm password" type="password" required autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} hint="Password confirmation is checked here and is not sent to the backend." /><label className="block"><span className="label">Role</span><select required value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })} className="input-wrap h-11 w-full bg-[#faf8fb] text-sm"><option value="">Select a role</option><option value="ADMIN">ADMIN</option><option value="SALES">SALES</option></select><span className="mt-1 block text-xs text-slate-500">Only dealership roles can be assigned here. PLATFORM_ADMIN is not available.</span></label><p className="text-xs leading-5 text-slate-500">User ID and tenant assignment are handled by the backend. The employee can sign in through the existing login page using this email and initial password.</p><div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={saving} onClick={() => setFormOpen(false)} className="h-11 border-brand-600 px-5 font-semibold text-brand-600 hover:bg-brand-50">Cancel</Button><Button type="submit" disabled={saving} className="h-11 bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700">{saving && <LoaderCircle size={16} className="animate-spin" />}{saving ? "Saving…" : editingId === null ? "Create user" : "Save changes"}</Button></div></form>}</section></div>}
      <SuccessToast message={notice} onDismiss={() => setNotice("")} />
    </main>
  );
}
