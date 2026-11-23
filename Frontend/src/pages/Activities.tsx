import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Activity as ActivityIcon, LoaderCircle, Plus, Search, X } from "lucide-react";
import Field from "../components/Field";
import { Button } from "../components/ui/button";
import { FeedbackMessage, SuccessToast } from "../components/Feedback";
import { handleUnauthorizedResponse } from "../lib/unauthorized";
import AssignmentControl from "../components/AssignmentControl";
import PageHeader from "../components/PageHeader";

type ActivityRecord = {
  activityId: number;
  customerId: number;
  leadId: number;
  activityType: string | null;
  notes: string | null;
  scheduledDateTime: string | null;
  status: string | null;
  nextFollowUpDate: string | null;
  tenantId: number;
  assignedUserId: number | null;
};
type Employee = { userId: number; name: string; email: string; role: string };
type Customer = { customerId: number; name: string; email: string };
type Lead = { leadId: number; source: string; status: string; interestedVehicle: string; customerId: number; notes: string | null };
type ActivityForm = { customerId: string; leadId: string; activityType: string; notes: string; scheduledDateTime: string; status: string; nextFollowUpDate: string };
type RequestOptions = { method?: "GET" | "POST" | "PUT"; body?: string };

const API_BASE_URL = "";
const EMPTY_FORM: ActivityForm = { customerId: "", leadId: "", activityType: "", notes: "", scheduledDateTime: "", status: "", nextFollowUpDate: "" };

async function activityRequest<T>(path: string, token: string, options: RequestOptions = {}): Promise<T> {
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

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function Activities() {
  const routeParams = new URLSearchParams(window.location.search);
  const scheduledLeadId = routeParams.get("new") === "1" ? routeParams.get("leadId") : null;
  const scheduledCustomerId = routeParams.get("new") === "1" ? routeParams.get("customerId") : null;
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const isAdmin = (() => { try { return JSON.parse(localStorage.getItem("autocrm_user") ?? "null")?.role?.toUpperCase() === "ADMIN"; } catch { return false; } })();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("search") ?? "");
  const [formOpen, setFormOpen] = useState(Boolean(scheduledLeadId && scheduledCustomerId));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [workFilter, setWorkFilter] = useState("ALL");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ActivityForm>(() => scheduledLeadId && scheduledCustomerId
    ? { ...EMPTY_FORM, leadId: scheduledLeadId, customerId: scheduledCustomerId }
    : EMPTY_FORM);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const token = localStorage.getItem("autocrm_token");
        if (!token) throw new Error("Your session has expired. Please log in again.");
        const [activityData, customerData, leadData, employeeData] = await Promise.all([
          activityRequest<ActivityRecord[]>("/api/activities", token),
          activityRequest<Customer[]>("/api/customers", token),
          activityRequest<Lead[]>("/api/leads", token),
          isAdmin ? activityRequest<Employee[]>("/api/users", token) : Promise.resolve([]),
        ]);
        if (!Array.isArray(activityData) || !Array.isArray(customerData) || !Array.isArray(leadData)) {
          throw new Error("The activity, customer, or lead response was not valid.");
        }
        if (active) { setActivities(activityData); setCustomers(customerData); setLeads(leadData); setEmployees(employeeData); }
      } catch (loadError) {
        if (active) setLoadError(loadError instanceof Error ? loadError.message : "Failed to load activities.");
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [isAdmin]);

  const customerById = useMemo(() => new Map(customers.map((customer) => [customer.customerId, customer])), [customers]);
  const leadById = useMemo(() => new Map(leads.map((lead) => [lead.leadId, lead])), [leads]);
  const customerLabel = (customerId: number) => customerById.get(customerId)?.name ?? `Customer #${customerId}`;
  const leadLabel = (leadId: number) => {
    const lead = leadById.get(leadId);
    return lead ? `Lead #${lead.leadId} · ${lead.source} · ${lead.status}` : `Lead #${leadId}`;
  };
  const today = localDateKey(new Date());
  const filteredActivities = activities.filter((item) => {
    const complete = item.status?.trim().toUpperCase() === "COMPLETED";
    const due = item.nextFollowUpDate;
    const matchesWorkFilter = workFilter === "ALL"
      || (workFilter === "COMPLETED" && complete)
      || (workFilter === "OVERDUE" && !complete && Boolean(due) && due! < today)
      || (workFilter === "DUE_TODAY" && !complete && due === today)
      || (workFilter === "UPCOMING" && !complete && Boolean(due) && due! > today);
    return matchesWorkFilter && [item.activityId, item.customerId, item.leadId, customerLabel(item.customerId), leadLabel(item.leadId), item.activityType ?? "", item.notes ?? "", item.scheduledDateTime ?? "", item.status ?? "", item.nextFollowUpDate ?? ""].join(" ").toLowerCase().includes(search.trim().toLowerCase());
  });

  const openCreateForm = () => { setError(""); setNotice(""); setEditingId(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEditForm = (activity: ActivityRecord) => {
    setError(""); setNotice(""); setEditingId(activity.activityId);
    setForm({ customerId: String(activity.customerId), leadId: String(activity.leadId), activityType: activity.activityType ?? "", notes: activity.notes ?? "", scheduledDateTime: activity.scheduledDateTime?.slice(0, 16) ?? "", status: activity.status ?? "", nextFollowUpDate: activity.nextFollowUpDate ?? "" });
    setFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setNotice(""); setSaving(true);
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const body = JSON.stringify({
        customerId: Number(form.customerId),
        leadId: Number(form.leadId),
        activityType: form.activityType.trim() || null,
        notes: form.notes.trim() || null,
        scheduledDateTime: form.scheduledDateTime || null,
        status: form.status.trim() || null,
        nextFollowUpDate: form.nextFollowUpDate || null,
      });
      const saved = await activityRequest<ActivityRecord>(editingId === null ? "/api/activities" : `/api/activities/${editingId}`, token, { method: editingId === null ? "POST" : "PUT", body });
      setActivities((current) => editingId === null ? (isAdmin || saved.assignedUserId !== null ? [saved, ...current] : current) : current.map((item) => item.activityId === saved.activityId ? saved : item));
      setNotice(editingId === null ? "Activity created successfully." : "Activity updated successfully.");
      setFormOpen(false); setForm(EMPTY_FORM); setEditingId(null);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Failed to save activity."); }
    finally { setSaving(false); }
  };

  const markCompleted = async (activity: ActivityRecord) => {
    setError(""); setNotice("");
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const updated = await activityRequest<ActivityRecord>(`/api/activities/${activity.activityId}`, token, { method: "PUT", body: JSON.stringify({ customerId: activity.customerId, leadId: activity.leadId, activityType: activity.activityType, notes: activity.notes, scheduledDateTime: activity.scheduledDateTime, status: "COMPLETED", nextFollowUpDate: activity.nextFollowUpDate }) });
      setActivities((current) => current.map((item) => item.activityId === updated.activityId ? updated : item));
      setNotice("Activity marked completed.");
    } catch (completeError) { setError(completeError instanceof Error ? completeError.message : "Failed to complete activity."); }
  };

  const handleAssign = async (activity: ActivityRecord, assigneeId: number | null) => {
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const updated = await activityRequest<ActivityRecord>(`/api/activities/${activity.activityId}/assignment`, token, { method: "PUT", body: JSON.stringify({ assigneeId }) });
      setActivities((current) => current.map((item) => item.activityId === updated.activityId ? updated : item));
      setNotice("Activity assignment updated.");
    } catch (assignmentError) { setError(assignmentError instanceof Error ? assignmentError.message : "Failed to update assignment."); }
  };

  return (
    <main className="crm-management-page bg-background text-foreground">
      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
        <PageHeader title="Activities & follow-ups" description="Record customer interactions and keep the next follow-up date visible to the assigned team." actions={<Button onClick={openCreateForm} size="lg" className="h-11 w-fit rounded-lg bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700"><Plus size={17} /> Add Activity</Button>} />
        <section className="overflow-hidden rounded-xl border border-brand-600/15 bg-white shadow-[0_8px_28px_-24px_rgba(58,6,64,0.45)]">
          <div className="flex flex-col gap-3 border-b border-brand-600/10 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between"><div className="flex flex-wrap gap-2" aria-label="Follow-up filters">{[["ALL", "All"], ["OVERDUE", "Overdue"], ["DUE_TODAY", "Due today"], ["UPCOMING", "Upcoming"], ["COMPLETED", "Completed"]].map(([value, label]) => <button key={value} type="button" onClick={() => setWorkFilter(value)} aria-pressed={workFilter === value} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${workFilter === value ? "border-brand-600 bg-brand-50 text-brand-700" : "border-brand-600/15 text-ink-soft hover:bg-brand-50"}`}>{label}</button>)}</div><label className="input-wrap h-10 w-full bg-[#faf8fb] md:max-w-sm"><Search size={17} aria-hidden="true" /><span className="sr-only">Search activities</span><input className="input" type="search" placeholder="Search activities" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
          {error && !formOpen && activities.length > 0 && <FeedbackMessage message={error} onDismiss={() => setError("")} className="mx-5 my-4 sm:mx-6" />}
          {loading ? <div role="status" className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground"><LoaderCircle size={18} className="animate-spin text-brand-600" /> Loading activities…</div>
            : loadError ? <div className="px-5 py-10"><FeedbackMessage message={loadError} action={{ label: "Retry", onClick: () => window.location.reload() }} /></div>
              : activities.length === 0 ? <div className="px-5 py-16 text-center"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600"><ActivityIcon size={22} /></span><h3 className="mt-4 font-display text-lg font-bold text-plum-950">No activities yet</h3><p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Create an activity to record an interaction or a follow-up.</p><Button onClick={openCreateForm} className="mt-5 rounded-lg bg-brand-600 font-semibold text-white hover:bg-brand-700"><Plus size={16} /> Add Activity</Button></div>
                : filteredActivities.length === 0 ? <div className="px-5 py-14 text-center"><h3 className="font-display text-lg font-bold text-plum-950">No matching activities</h3><p className="mt-1 text-sm text-muted-foreground">Try another customer, lead, activity type, or status.</p></div>
                  : <><div className="hidden overflow-x-auto xl:block"><table className="w-full min-w-[1100px] border-collapse text-left"><thead className="bg-[#faf7fb] text-xs font-bold uppercase tracking-[0.08em] text-brand-700"><tr><th className="px-5 py-3.5 sm:px-6">Activity</th><th className="px-5 py-3.5">Customer</th><th className="px-5 py-3.5">Lead</th><th className="px-5 py-3.5">Scheduled</th><th className="px-5 py-3.5">Next follow-up</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5">Notes</th><th className="px-5 py-3.5">Actions</th>{isAdmin && <th className="px-5 py-3.5">Assignment</th>}</tr></thead><tbody className="divide-y divide-brand-600/10 text-sm">{filteredActivities.map((item) => <tr key={item.activityId} className="transition hover:bg-[#fdfafd]"><td className="px-5 py-4 sm:px-6"><p className="font-semibold text-foreground">{item.activityType || "Activity"}</p><p className="mt-0.5 text-xs text-muted-foreground">ID {item.activityId}</p></td><td className="px-5 py-4 text-ink-soft"><Link className="hover:text-brand-700 hover:underline" to={`/customers?search=${item.customerId}`}>{customerLabel(item.customerId)}</Link></td><td className="px-5 py-4 text-ink-soft"><Link className="hover:text-brand-700 hover:underline" to={`/leads?search=${item.leadId}`}>{leadLabel(item.leadId)}</Link></td><td className="px-5 py-4 text-ink-soft">{formatDateTime(item.scheduledDateTime)}</td><td className="px-5 py-4 text-ink-soft"><span className={item.nextFollowUpDate && item.nextFollowUpDate < today && item.status?.toUpperCase() !== "COMPLETED" ? "font-semibold text-red-700" : ""}>{formatDate(item.nextFollowUpDate)}</span></td><td className="px-5 py-4">{item.status ? <span className="inline-flex rounded-full border border-brand-300/60 bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">{item.status}</span> : <span className="text-muted-foreground">—</span>}</td><td className="max-w-xs px-5 py-4 text-ink-soft">{item.notes || "—"}</td><td className="px-5 py-4"><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => openEditForm(item)} aria-label={`Edit activity ${item.activityId}`}>Edit</Button>{item.status?.toUpperCase() !== "COMPLETED" && <Button variant="outline" size="sm" onClick={() => void markCompleted(item)}>Complete</Button>}</div></td>{isAdmin && <td className="px-5 py-4"><AssignmentControl users={employees} assignedUserId={item.assignedUserId} onAssign={(id) => void handleAssign(item, id)} /></td>}</tr>)}</tbody></table></div>
                    <div className="divide-y divide-brand-600/10 xl:hidden">{filteredActivities.map((item) => <article key={item.activityId} className="p-4 sm:p-5"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><ActivityIcon size={18} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-foreground">{item.activityType || "Activity"}</h3>{item.status && <span className="inline-flex rounded-full border border-brand-300/60 bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">{item.status}</span>}</div><p className="mt-1 text-xs text-muted-foreground">Activity ID {item.activityId}</p></div></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Customer</dt><dd className="text-ink-soft"><Link to={`/customers?search=${item.customerId}`} className="hover:text-brand-700 hover:underline">{customerLabel(item.customerId)}</Link></dd></div><div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Lead</dt><dd className="text-ink-soft"><Link to={`/leads?search=${item.leadId}`} className="hover:text-brand-700 hover:underline">{leadLabel(item.leadId)}</Link></dd></div><div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Scheduled</dt><dd className="text-ink-soft">{formatDateTime(item.scheduledDateTime)}</dd></div><div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Next follow-up</dt><dd className={item.nextFollowUpDate && item.nextFollowUpDate < today && item.status?.toUpperCase() !== "COMPLETED" ? "font-semibold text-red-700" : "text-ink-soft"}>{formatDate(item.nextFollowUpDate)}</dd></div>{item.notes && <div className="col-span-2"><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Notes</dt><dd className="whitespace-pre-wrap text-ink-soft">{item.notes}</dd></div>}</dl><div className="mt-4 flex gap-2"><Button variant="outline" size="sm" onClick={() => openEditForm(item)}>Edit</Button>{item.status?.toUpperCase() !== "COMPLETED" && <Button variant="outline" size="sm" onClick={() => void markCompleted(item)}>Complete</Button>}</div>{isAdmin && <div className="mt-4"><AssignmentControl users={employees} assignedUserId={item.assignedUserId} onAssign={(id) => void handleAssign(item, id)} /></div>}</article>)}</div></>}
        </section>
      </div>

      {formOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#200024]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setFormOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="activity-form-title" className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-7"><div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b5b91]">Activity record</p><h2 id="activity-form-title" className="mt-1 font-display text-2xl font-extrabold text-[#32103a]">{editingId === null ? "Add activity" : `Edit activity #${editingId}`}</h2></div><Button variant="ghost" size="icon" onClick={() => setFormOpen(false)} disabled={saving} aria-label="Close form" className="text-muted-foreground hover:bg-secondary hover:text-foreground"><X size={19} /></Button></div>{error && <FeedbackMessage message={error} onDismiss={() => setError("")} className="mb-4" />}<form onSubmit={handleSubmit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="label">Customer</span><select required value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })} className="input-wrap h-11 w-full bg-[#faf8fb] text-sm"><option value="">Select a customer</option>{customers.map((customer) => <option key={customer.customerId} value={customer.customerId}>{customer.name} · {customer.email}</option>)}</select></label><label className="block"><span className="label">Lead</span><select required value={form.leadId} onChange={(event) => setForm({ ...form, leadId: event.target.value })} className="input-wrap h-11 w-full bg-[#faf8fb] text-sm"><option value="">Select a lead</option>{leads.map((lead) => <option key={lead.leadId} value={lead.leadId}>Lead #{lead.leadId} · {lead.source} · {lead.status}</option>)}</select></label><Field label="Activity type" value={form.activityType} onChange={(event) => setForm({ ...form, activityType: event.target.value })} /><Field label="Status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} hint="Use COMPLETED when the activity is finished." /><Field label="Scheduled date and time" type="datetime-local" value={form.scheduledDateTime} onChange={(event) => setForm({ ...form, scheduledDateTime: event.target.value })} /><Field label="Next follow-up date" type="date" value={form.nextFollowUpDate} onChange={(event) => setForm({ ...form, nextFollowUpDate: event.target.value })} /></div><label className="block"><span className="label">Notes</span><textarea rows={4} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="w-full resize-y rounded-lg border border-black/10 bg-[#faf8fb] px-3.5 py-3 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20" /></label><p className="text-xs leading-5 text-slate-500">Activity ID, tenant and assignment are managed by the backend. Customer and lead must belong to your dealership.</p><div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={saving} onClick={() => setFormOpen(false)} className="h-11 border-brand-600 px-5 font-semibold text-brand-600 hover:bg-brand-50">Cancel</Button><Button type="submit" disabled={saving || customers.length === 0 || leads.length === 0} className="h-11 bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700">{saving && <LoaderCircle size={16} className="animate-spin" />}{saving ? "Saving…" : editingId === null ? "Create activity" : "Save activity"}</Button></div></form></section></div>}
      <SuccessToast message={notice} onDismiss={() => setNotice("")} />
    </main>
  );
}
