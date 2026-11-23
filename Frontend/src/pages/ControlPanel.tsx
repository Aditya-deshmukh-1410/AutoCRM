import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Building2, LoaderCircle, LogOut, Pencil, Plus, RefreshCw, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FeedbackMessage, SuccessToast } from "../components/Feedback";
import { Button } from "../components/ui/button";
import { handleUnauthorizedResponse } from "../lib/unauthorized";

type TenantSummary = { tenantId: number; name: string; email: string | null; phone: string | null; address: string | null; userCount: number; adminCount: number };
type TenantUser = { userId: number; name: string; email: string; role: string };
type TenantDetail = { tenantId: number; name: string; email: string | null; phone: string | null; address: string | null; users: TenantUser[] };
type PlatformMetrics = { dealershipCount: number; dealershipAdminCount: number; salesUserCount: number };
type TenantForm = { name: string; email: string; phone: string; address: string };
type OnboardingForm = TenantForm & { adminName: string; adminEmail: string; initialPassword: string };

const API_BASE_URL = "";
const EMPTY_TENANT: TenantForm = { name: "", email: "", phone: "", address: "" };
const EMPTY_ONBOARDING: OnboardingForm = { ...EMPTY_TENANT, adminName: "", adminEmail: "", initialPassword: "" };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("autocrm_token");
  if (!token) throw new Error("Your session has expired. Please log in again.");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
  });
  if (handleUnauthorizedResponse(response)) throw new Error("Your session has expired. Please log in again.");
  const text = await response.text();
  let body: unknown = text;
  if (text) { try { body = JSON.parse(text); } catch { /* Keep text response. */ } }
  if (!response.ok) {
    if (typeof body === "object" && body !== null) {
      const value = body as Record<string, unknown>;
      if (typeof value.error === "string") throw new Error(value.error);
      const fields = Object.values(value).filter((item): item is string => typeof item === "string");
      if (fields.length) throw new Error(fields.join(" "));
    }
    throw new Error(typeof body === "string" && body.trim() ? body : `Request failed (${response.status})`);
  }
  return body as T;
}

export default function ControlPanel() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [selected, setSelected] = useState<TenantDetail | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formMode, setFormMode] = useState<"onboard" | "edit" | null>(null);
  const [form, setForm] = useState<TenantForm>(EMPTY_TENANT);
  const [onboarding, setOnboarding] = useState<OnboardingForm>(EMPTY_ONBOARDING);

  const loadWorkspace = useCallback(async (query = "") => {
    setLoading(true);
    setError("");
    try {
      const encoded = query.trim() ? `?search=${encodeURIComponent(query.trim())}` : "";
      const [metricData, tenantData] = await Promise.all([
        request<PlatformMetrics>("/api/tenants/metrics"),
        request<TenantSummary[]>(`/api/tenants${encoded}`),
      ]);
      setMetrics(metricData);
      setTenants(tenantData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load platform data.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadWorkspace(search); }, search.trim() ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [search, loadWorkspace]);

  const openTenant = async (tenantId: number) => {
    setError(""); setDetailsLoading(true);
    try { setSelected(await request<TenantDetail>(`/api/tenants/${tenantId}`)); }
    catch (detailError) { setError(detailError instanceof Error ? detailError.message : "Could not load dealership details."); }
    finally { setDetailsLoading(false); }
  };

  const startOnboarding = () => {
    setError(""); setNotice(""); setSelected(null); setFormMode("onboard");
    setOnboarding(EMPTY_ONBOARDING);
  };

  const closeForm = () => {
    setFormMode(null);
    setOnboarding(EMPTY_ONBOARDING);
  };

  const startEdit = (tenant: TenantDetail) => {
    setError(""); setNotice("");
    setForm({ name: tenant.name, email: tenant.email ?? "", phone: tenant.phone ?? "", address: tenant.address ?? "" });
    setFormMode("edit");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      if (formMode === "onboard") {
        const created = await request<TenantDetail>("/api/tenants", { method: "POST", body: JSON.stringify({ dealershipName: onboarding.name, contactEmail: onboarding.email || null, phone: onboarding.phone || null, address: onboarding.address || null, adminName: onboarding.adminName, adminEmail: onboarding.adminEmail, initialPassword: onboarding.initialPassword }) });
        setSelected(created);
        setNotice("Dealership and initial ADMIN account created. The administrator can now sign in with the provided email and password.");
      } else if (formMode === "edit" && selected) {
        const updated = await request<TenantDetail>(`/api/tenants/${selected.tenantId}`, { method: "PUT", body: JSON.stringify({ name: form.name, email: form.email || null, phone: form.phone || null, address: form.address || null }) });
        setSelected(updated);
        setNotice("Dealership details saved.");
      }
      setFormMode(null);
      setOnboarding(EMPTY_ONBOARDING);
      await loadWorkspace(search);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save dealership details.");
    } finally { setSaving(false); }
  };

  const logout = () => {
    localStorage.removeItem("autocrm_token"); localStorage.removeItem("autocrm_user");
    navigate("/login", { replace: true });
  };

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-700">AutoCRM platform</p><h1 className="mt-1 text-xl font-bold">Control Panel</h1></div>
        <Button variant="outline" onClick={logout} className="gap-2"><LogOut size={16} /> Log out</Button>
      </div>
    </header>
    <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-bold">Dealerships</h2><p className="mt-1 text-sm text-slate-600">Platform-wide overview and tenant onboarding.</p></div><Button onClick={startOnboarding} className="gap-2 bg-violet-700 text-white hover:bg-violet-800"><Plus size={16} /> Onboard dealership</Button></div>
      {error && <FeedbackMessage message={error} onDismiss={() => setError("")} className="mb-5" />}
      <section aria-label="Platform metrics" className="mb-6 grid gap-4 sm:grid-cols-3">
        {[["Dealerships", metrics?.dealershipCount], ["Dealership ADMINs", metrics?.dealershipAdminCount], ["SALES users", metrics?.salesUserCount]].map(([label, value]) => <article key={String(label)} className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm font-medium text-slate-600">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{metrics ? value : "—"}</p></article>)}
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center"><label className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3"><Search size={16} className="text-slate-500" /><span className="sr-only">Search dealerships</span><input className="w-full bg-transparent text-sm outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, phone, address, or ID" /></label><Button variant="outline" onClick={() => void loadWorkspace(search)} disabled={loading} aria-label="Refresh platform data"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></Button></div>
          {loading ? <div role="status" className="flex justify-center gap-2 p-12 text-sm text-slate-600"><LoaderCircle size={18} className="animate-spin" /> Loading dealerships…</div>
            : tenants.length === 0 ? <div className="p-12 text-center"><Building2 className="mx-auto text-slate-400" size={28} /><h3 className="mt-3 font-semibold">{search ? "No matching dealerships" : "No dealerships yet"}</h3><p className="mt-1 text-sm text-slate-600">{search ? "Try a different search." : "Onboard the first dealership to get started."}</p></div>
              : <div className="divide-y divide-slate-100">{tenants.map((tenant) => <button type="button" key={tenant.tenantId} onClick={() => void openTenant(tenant.tenantId)} className={`block w-full px-5 py-4 text-left transition hover:bg-violet-50 ${selected?.tenantId === tenant.tenantId ? "bg-violet-50" : ""}`}><span className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{tenant.name}</span><span className="text-xs text-slate-500">Dealership #{tenant.tenantId}</span></span><span className="mt-1 block text-sm text-slate-600">{tenant.email || "No contact email"}{tenant.phone ? ` · ${tenant.phone}` : ""}</span><span className="mt-1 block text-xs text-slate-500">{tenant.adminCount} ADMIN · {tenant.userCount} total users</span></button>)}</div>}
        </section>
        <section className="min-h-64 rounded-xl border border-slate-200 bg-white p-5">
          {detailsLoading ? <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-600"><LoaderCircle size={18} className="animate-spin" /> Loading details…</div>
            : selected ? <><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-violet-700">Dealership #{selected.tenantId}</p><h3 className="mt-1 text-lg font-bold">{selected.name}</h3></div><Button variant="outline" size="sm" onClick={() => startEdit(selected)} className="gap-2"><Pencil size={14} /> Edit</Button></div><dl className="mt-5 space-y-3 text-sm"><div><dt className="text-xs font-semibold uppercase text-slate-500">Contact email</dt><dd>{selected.email || "—"}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-500">Phone</dt><dd>{selected.phone || "—"}</dd></div><div><dt className="text-xs font-semibold uppercase text-slate-500">Address</dt><dd>{selected.address || "—"}</dd></div></dl><div className="mt-6 border-t border-slate-200 pt-4"><h4 className="font-semibold">Users</h4>{selected.users.length ? <ul className="mt-3 space-y-2">{selected.users.map((user) => <li key={user.userId} className="flex flex-wrap justify-between gap-2 text-sm"><span><span className="font-medium">{user.name}</span><span className="ml-2 text-slate-600">{user.email}</span></span><span className="text-xs font-semibold uppercase text-slate-500">{user.role}</span></li>)}</ul> : <p className="mt-2 text-sm text-slate-600">No users are linked to this dealership.</p>}</div></>
              : <div className="flex h-full min-h-56 flex-col items-center justify-center text-center"><Building2 size={28} className="text-slate-400" /><h3 className="mt-3 font-semibold">Select a dealership</h3><p className="mt-1 max-w-xs text-sm text-slate-600">View its contact details and provisioned dealership accounts.</p></div>}
        </section>
      </div>
      <p className="mt-5 text-xs text-slate-500">Tenant status controls are unavailable because the current tenant model has no lifecycle status field.</p>
    </div>

    {formMode && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-5"><section role="dialog" aria-modal="true" aria-labelledby="tenant-form-title" className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-7"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-violet-700">Platform administration</p><h2 id="tenant-form-title" className="mt-1 text-xl font-bold">{formMode === "onboard" ? "Onboard dealership" : "Edit dealership details"}</h2></div><Button variant="ghost" size="icon" onClick={closeForm} disabled={saving} aria-label="Close"><X size={18} /></Button></div>{error && <FeedbackMessage message={error} onDismiss={() => setError("")} className="mb-4" />}<form onSubmit={handleSubmit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-sm font-medium">Dealership name *</span><input required maxLength={255} value={formMode === "onboard" ? onboarding.name : form.name} onChange={(event) => formMode === "onboard" ? setOnboarding({ ...onboarding, name: event.target.value }) : setForm({ ...form, name: event.target.value })} className="h-11 w-full rounded-lg border border-slate-300 px-3" /></label><label className="block"><span className="mb-1.5 block text-sm font-medium">Contact email</span><input type="email" maxLength={255} value={formMode === "onboard" ? onboarding.email : form.email} onChange={(event) => formMode === "onboard" ? setOnboarding({ ...onboarding, email: event.target.value }) : setForm({ ...form, email: event.target.value })} className="h-11 w-full rounded-lg border border-slate-300 px-3" /></label><label className="block"><span className="mb-1.5 block text-sm font-medium">Contact phone</span><input maxLength={255} value={formMode === "onboard" ? onboarding.phone : form.phone} onChange={(event) => formMode === "onboard" ? setOnboarding({ ...onboarding, phone: event.target.value }) : setForm({ ...form, phone: event.target.value })} className="h-11 w-full rounded-lg border border-slate-300 px-3" /></label></div><label className="block"><span className="mb-1.5 block text-sm font-medium">Address</span><textarea maxLength={500} rows={2} value={formMode === "onboard" ? onboarding.address : form.address} onChange={(event) => formMode === "onboard" ? setOnboarding({ ...onboarding, address: event.target.value }) : setForm({ ...form, address: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label>{formMode === "onboard" && <div className="border-t border-slate-200 pt-4"><h3 className="font-semibold">Initial dealership ADMIN</h3><p className="mt-1 text-sm text-slate-600">The account is created in the same transaction as the dealership. The initial password is stored only as a BCrypt hash.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-sm font-medium">Administrator name *</span><input required maxLength={255} value={onboarding.adminName} onChange={(event) => setOnboarding({ ...onboarding, adminName: event.target.value })} className="h-11 w-full rounded-lg border border-slate-300 px-3" /></label><label className="block"><span className="mb-1.5 block text-sm font-medium">Administrator email *</span><input required type="email" maxLength={255} value={onboarding.adminEmail} onChange={(event) => setOnboarding({ ...onboarding, adminEmail: event.target.value })} className="h-11 w-full rounded-lg border border-slate-300 px-3" /></label><label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-medium">Initial password *</span><input required type="password" autoComplete="new-password" value={onboarding.initialPassword} onChange={(event) => setOnboarding({ ...onboarding, initialPassword: event.target.value })} className="h-11 w-full rounded-lg border border-slate-300 px-3" /></label></div></div>}<div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={saving} onClick={closeForm}>Cancel</Button><Button type="submit" disabled={saving} className="gap-2 bg-violet-700 text-white hover:bg-violet-800">{saving && <LoaderCircle size={16} className="animate-spin" />}{formMode === "onboard" ? "Create dealership and ADMIN" : "Save details"}</Button></div></form></section></div>}
    <SuccessToast message={notice} onDismiss={() => setNotice("")} />
  </main>;
}
