import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle, MessageCircle, Pencil, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import Field from "../components/Field";
import { Button } from "../components/ui/button";
import { FeedbackMessage, SuccessToast } from "../components/Feedback";
import { handleUnauthorizedResponse } from "../lib/unauthorized";
import AssignmentControl from "../components/AssignmentControl";
import PageHeader from "../components/PageHeader";
import { BASE } from "../lib/siteApi";
import { whatsappChatUrl } from "../lib/whatsapp";

type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "LOST";

type Lead = {
  leadId: number;
  source: string;
  status: LeadStatus;
  interestedVehicle: string;
  notes: string | null;
  customerId: number;
  tenantId: number;
  assignedUserId: number | null;
};
type Employee = { userId: number; name: string; email: string; role: string };
type LeadSourceOption = { optionId: number; optionType: "LEAD_SOURCE" | "VEHICLE_CATEGORY"; value: string; active: boolean };

type Customer = {
  customerId: number;
  name: string;
  email: string;
  phone: string;
  address: string | null;
  tenantId: number;
};

type LeadInput = Pick<Lead, "source" | "status" | "interestedVehicle" | "notes"> & {
  customerId: number | "";
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: string;
};

function SellerPhotos({ leadId }: { leadId: number }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    const objectUrls: string[] = [];
    const token = localStorage.getItem("autocrm_token");
    if (!token) return;
    void fetch(`${BASE}/api/website/sell-requests/${leadId}/photos`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (response) => {
      if (!response.ok) return [] as { id: string; contentType: string }[];
      return response.json() as Promise<{ id: string; contentType: string }[]>;
    }).then(async (photos) => {
      const blobs = await Promise.all(photos.map(async (photo) => {
        const response = await fetch(`${BASE}/api/website/sell-requests/${leadId}/photos/${photo.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return null;
        const url = URL.createObjectURL(await response.blob());
        objectUrls.push(url);
        return url;
      }));
      if (live) setUrls(blobs.filter((url): url is string => Boolean(url)));
    }).catch(() => {});
    return () => { live = false; objectUrls.forEach(URL.revokeObjectURL); };
  }, [leadId]);
  if (!urls.length) return null;
  return <div className="mt-2 flex flex-wrap gap-2" aria-label="Seller car photos">
    {urls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" aria-label={`Open seller photo ${index + 1}`}>
      <img src={url} alt={`Seller car photo ${index + 1}`} className="size-14 rounded-md border border-black/10 object-cover" />
    </a>)}
  </div>;
}

const API_BASE_URL = "";
const LEAD_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"];
const EMPTY_FORM: LeadInput = {
  source: "",
  status: "NEW",
  interestedVehicle: "",
  notes: "",
  customerId: "",
};

const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "border-brand-300 bg-brand-50 text-brand-700",
  CONTACTED: "border-violet-200 bg-violet-50 text-violet-700",
  QUALIFIED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CONVERTED: "border-teal-200 bg-teal-50 text-teal-700",
  LOST: "border-rose-200 bg-rose-50 text-rose-700",
};

async function leadRequest<T>(path: string, token: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body,
  });

  if (handleUnauthorizedResponse(response)) {
    throw new Error("Your session has expired. Please log in again.");
  }

  const responseText = await response.text();
  let responseBody: unknown = responseText;

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }
  }

  if (!response.ok) {
    const body = responseBody as { error?: unknown } | string | null;
    const message =
      typeof body === "object" && body !== null && typeof body.error === "string"
        ? body.error
        : typeof body === "string" && body.trim()
          ? body
          : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return responseBody as T;
}

function statusLabel(status: LeadStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSourceOption[]>([]);
  const isAdmin = (() => { try { return JSON.parse(localStorage.getItem("autocrm_user") ?? "null")?.role?.toUpperCase() === "ADMIN"; } catch { return false; } })();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("search") ?? "");
  const [stageFilter, setStageFilter] = useState<LeadStatus | "ALL">("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<LeadInput>(EMPTY_FORM);

  useEffect(() => {
    let active = true;

    const loadWorkspaceData = async () => {
      try {
        const token = localStorage.getItem("autocrm_token");
        if (!token) {
          throw new Error("Your session has expired. Please log in again.");
        }

        const [leadData, customerData, employeeData, settingOptions] = await Promise.all([
          leadRequest<Lead[]>("/api/leads", token),
          leadRequest<Customer[]>("/api/customers", token),
          isAdmin ? leadRequest<Employee[]>("/api/users", token) : Promise.resolve([]),
          leadRequest<LeadSourceOption[]>("/api/dealership-settings", token),
        ]);

        if (!Array.isArray(leadData) || !Array.isArray(customerData)) {
          throw new Error("The lead or customer list response was not valid.");
        }

        if (active) {
          setLeads(leadData);
          setCustomers(customerData);
          setEmployees(employeeData);
          setLeadSources(settingOptions.filter((option) => option.optionType === "LEAD_SOURCE" && option.active));
        }
      } catch (requestError) {
        if (active) {
          setLoadError(requestError instanceof Error ? requestError.message : "Failed to load leads.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadWorkspaceData();
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const openCreateForm = () => {
    setError("");
    setNotice("");
    setEditingId(null);
    setForm({ ...EMPTY_FORM, customerId: customers[0]?.customerId ?? "" });
    setFormOpen(true);
  };

  const openEditForm = async (leadId: number) => {
    setError("");
    setNotice("");
    setEditingId(leadId);
    setFormLoading(true);
    setFormOpen(true);

    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");

      const lead = await leadRequest<Lead>(`/api/leads/${leadId}`, token);
      setForm({
        source: lead.source,
        status: lead.status,
        interestedVehicle: lead.interestedVehicle,
        notes: lead.notes ?? "",
        customerId: lead.customerId,
      });
    } catch (requestError) {
      setFormOpen(false);
      setError(requestError instanceof Error ? requestError.message : "Failed to load lead.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (form.customerId === "") {
      setError("Choose a customer for this lead.");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");

      const body = JSON.stringify({
        source: form.source.trim(),
        status: form.status,
        interestedVehicle: form.interestedVehicle.trim(),
        notes: (form.notes ?? "").trim(),
        customerId: Number(form.customerId),
      });

      if (editingId === null) {
        const created = await leadRequest<Lead>("/api/leads", token, { method: "POST", body });
        if (isAdmin || created.assignedUserId !== null) setLeads((current) => [created, ...current]);
        setNotice("Lead created successfully.");
      } else {
        const updated = await leadRequest<Lead>(`/api/leads/${editingId}`, token, { method: "PUT", body });
        setLeads((current) => current.map((lead) => lead.leadId === editingId ? updated : lead));
        setNotice("Lead updated successfully.");
      }

      setFormOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to save lead.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lead: Lead) => {
    if (!window.confirm(`Delete lead #${lead.leadId}? This action cannot be undone.`)) return;

    setError("");
    setNotice("");
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");

      const result = await leadRequest<string>(`/api/leads/${lead.leadId}`, token, { method: "DELETE" });
      setLeads((current) => current.filter((item) => item.leadId !== lead.leadId));
      setNotice(typeof result === "string" && result ? result : "Lead deleted successfully.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to delete lead.");
    }
  };

  const handleAssign = async (lead: Lead, assigneeId: number | null) => {
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const updated = await leadRequest<Lead>(`/api/leads/${lead.leadId}/assignment`, token, { method: "PUT", body: JSON.stringify({ assigneeId }) });
      setLeads((current) => current.map((item) => item.leadId === updated.leadId ? updated : item));
      setNotice("Lead assignment updated.");
    } catch (assignmentError) { setError(assignmentError instanceof Error ? assignmentError.message : "Failed to update assignment."); }
  };

  const customerById = new Map(customers.map((customer) => [customer.customerId, customer]));
  const normalizedSearch = search.trim().toLowerCase();
  const filteredLeads = leads.filter((lead) => {
    const customer = customerById.get(lead.customerId);
    return (stageFilter === "ALL" || lead.status === stageFilter) && [
      String(lead.leadId),
      String(lead.customerId),
      lead.source,
      lead.status,
      lead.interestedVehicle,
      lead.notes ?? "",
      customer?.name ?? `Customer ${lead.customerId}`,
      customer?.email ?? "",
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
  });

  return (
    <main className="crm-management-page bg-background text-foreground">

      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
        <PageHeader title="Leads" description="Track enquiries, source, interest, status, and ownership through the path to a sale." actions={<><Button onClick={openCreateForm} size="lg" disabled={customers.length === 0} className="h-11 w-fit rounded-lg bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700"><Plus size={17} /> Add Lead</Button>{customers.length === 0 && !loading && <p className="text-xs text-muted-foreground">Add a customer before creating a lead.</p>}</>} />

        <section className="overflow-hidden rounded-xl border border-brand-600/15 bg-white shadow-[0_8px_28px_-24px_rgba(58,6,64,0.45)]">
          <div className="flex flex-col gap-3 border-b border-brand-600/10 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2" aria-label="Lead stage filters">
              {["ALL", ...LEAD_STATUSES].map((stage) => {
                const count = stage === "ALL" ? leads.length : leads.filter((lead) => lead.status === stage).length;
                const selected = stageFilter === stage;
                return <button key={stage} type="button" onClick={() => setStageFilter(stage as LeadStatus | "ALL")} aria-pressed={selected} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selected ? "border-brand-600 bg-brand-50 text-brand-700" : "border-brand-600/15 text-ink-soft hover:bg-brand-50"}`}>{stage === "ALL" ? "All stages" : statusLabel(stage as LeadStatus)} <span className="ml-1 opacity-70">{count}</span></button>;
              })}
            </div>
            <label className="input-wrap h-10 w-full bg-[#faf8fb] sm:ml-auto sm:max-w-sm">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search leads</span>
              <input className="input" type="search" placeholder="Search leads" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
          </div>

          {error && !formOpen && leads.length > 0 && <FeedbackMessage message={error} onDismiss={() => setError("")} className="mx-5 my-4 sm:mx-6" />}

          {loading ? (
            <div role="status" className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground"><LoaderCircle size={18} className="animate-spin text-brand-600" /> Loading leads…</div>
          ) : loadError ? (
            <div className="px-5 py-10"><FeedbackMessage message={loadError} action={{ label: "Retry", onClick: () => window.location.reload() }} /></div>
          ) : leads.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600"><UserRound size={22} /></span>
              <h3 className="mt-4 font-display text-lg font-bold text-plum-950">No leads yet</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Create a lead and link it to an existing customer record.</p>
              {customers.length > 0 ? (
                <Button onClick={openCreateForm} className="mt-5 rounded-lg bg-brand-600 font-semibold text-white hover:bg-brand-700"><Plus size={16} /> Add Lead</Button>
              ) : (
                <Link to="/customers" className="mt-5 inline-flex rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-50">Go to Customers</Link>
              )}
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="px-5 py-14 text-center"><h3 className="font-display text-lg font-bold text-plum-950">No matching leads</h3><p className="mt-1 text-sm text-muted-foreground">Try another customer, status, source, or vehicle.</p></div>
          ) : (
            <>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[920px] border-collapse text-left">
                  <thead className="bg-[#faf7fb] text-xs font-bold uppercase tracking-[0.08em] text-brand-700">
                    <tr>
                      <th className="px-5 py-3.5 sm:px-6">Lead / Customer</th>
                      <th className="px-5 py-3.5">Source</th>
                      <th className="px-5 py-3.5">Interested vehicle</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-600/10 text-sm">
                    {filteredLeads.map((lead) => (
                      <tr key={lead.leadId} className="transition hover:bg-[#fdfafd]">
                        <td className="px-5 py-4 sm:px-6"><Link to={`/customers?search=${lead.customerId}`} className="font-semibold text-foreground hover:text-brand-700 hover:underline">{customerById.get(lead.customerId)?.name ?? `Customer #${lead.customerId}`}</Link><p className="mt-0.5 text-xs text-muted-foreground">Lead #{lead.leadId}</p>{(() => { const url = whatsappChatUrl(customerById.get(lead.customerId)?.phone ?? ""); return url ? <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${customerById.get(lead.customerId)?.name ?? "customer"}`} className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><MessageCircle size={14} /> WhatsApp</a> : null; })()}</td>
                        <td className="px-5 py-4 text-ink-soft">{lead.source}</td>
                        <td className="px-5 py-4 text-ink-soft">{lead.interestedVehicle}{lead.notes && <p className="mt-1 max-w-sm whitespace-pre-line text-xs text-muted-foreground">{lead.notes}</p>}{lead.source === "PUBLIC_SELL_REQUEST" && <SellerPhotos leadId={lead.leadId} />}</td>
                        <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[lead.status]}`}>{statusLabel(lead.status)}</span></td>
                        <td className="px-5 py-4"><div className="flex items-center justify-end gap-2">{isAdmin && <AssignmentControl users={employees} assignedUserId={lead.assignedUserId} onAssign={(id) => void handleAssign(lead, id)} />}<Link to={`/activities?new=1&leadId=${lead.leadId}&customerId=${lead.customerId}`} className="rounded-md border border-brand-600/20 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">Schedule follow-up</Link><Link to={`/test-drives?new=1&customerId=${lead.customerId}`} className="inline-flex items-center rounded-md border border-brand-600/20 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50">Schedule test drive</Link><Button variant="outline" size="icon" onClick={() => void openEditForm(lead.leadId)} aria-label={`Edit lead ${lead.leadId}`} className="border-brand-600/20 text-brand-700 hover:bg-brand-50"><Pencil size={16} /></Button><Button variant="outline" size="icon" onClick={() => void handleDelete(lead)} aria-label={`Delete lead ${lead.leadId}`} className="border-red-200 text-red-700 hover:bg-red-50"><Trash2 size={16} /></Button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-brand-600/10 sm:hidden">
                {filteredLeads.map((lead) => (
                  <article key={lead.leadId} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-foreground"><Link to={`/customers?search=${lead.customerId}`} className="hover:text-brand-700 hover:underline">{customerById.get(lead.customerId)?.name ?? `Customer #${lead.customerId}`}</Link></h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">Lead #{lead.leadId} · {lead.source}</p>
                        {(() => { const url = whatsappChatUrl(customerById.get(lead.customerId)?.phone ?? ""); return url ? <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><MessageCircle size={14} /> WhatsApp</a> : null; })()}
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[lead.status]}`}>{statusLabel(lead.status)}</span>
                    </div>
                    <p className="mt-3 text-sm text-ink-soft"><span className="font-semibold text-foreground">Interested in:</span> {lead.interestedVehicle}</p>
                    {lead.notes && <p className="mt-1 text-sm text-muted-foreground">{lead.notes}</p>}
                    {lead.source === "PUBLIC_SELL_REQUEST" && <SellerPhotos leadId={lead.leadId} />}
                    {isAdmin && <div className="mt-3"><AssignmentControl users={employees} assignedUserId={lead.assignedUserId} onAssign={(id) => void handleAssign(lead, id)} /></div>}
                    <div className="mt-3 flex justify-end gap-2">
                      <Link to={`/activities?new=1&leadId=${lead.leadId}&customerId=${lead.customerId}`} className="inline-flex items-center rounded-md border border-brand-600/20 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50">Schedule follow-up</Link>
                      <Button variant="outline" size="icon" onClick={() => void openEditForm(lead.leadId)} aria-label={`Edit lead ${lead.leadId}`} className="border-brand-600/20 text-brand-700 hover:bg-brand-50"><Pencil size={16} /></Button>
                      <Button variant="outline" size="icon" onClick={() => void handleDelete(lead)} aria-label={`Delete lead ${lead.leadId}`} className="border-red-200 text-red-700 hover:bg-red-50"><Trash2 size={16} /></Button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#200024]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving && !formLoading) setFormOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="lead-form-title" className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">Lead record</p>
                <h2 id="lead-form-title" className="mt-1 font-display text-2xl font-extrabold text-plum-950">{editingId === null ? "Add lead" : "Edit lead"}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setFormOpen(false)} disabled={saving || formLoading} aria-label="Close form" className="text-muted-foreground hover:bg-secondary hover:text-foreground"><X size={19} /></Button>
            </div>

            {error && <FeedbackMessage message={error} onDismiss={() => setError("")} className="mb-4" />}

            {formLoading ? (
              <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><LoaderCircle size={18} className="animate-spin text-brand-600" /> Loading lead…</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block"><span className="label">Source</span><select required value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} className="h-11 w-full rounded-lg border border-black/10 bg-[#faf8fb] px-3.5 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"><option value="" disabled>Select a source</option>{!leadSources.some((option) => option.value === form.source) && form.source && <option value={form.source}>{form.source} (existing value)</option>}{leadSources.map((option) => <option key={option.optionId} value={option.value}>{option.value === "PUBLIC_SHOWROOM" ? "Public showroom" : option.value}</option>)}</select></label>
                <label className="block">
                  <span className="label">Customer</span>
                  <select required value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value ? Number(event.target.value) : "" })} className="h-11 w-full rounded-lg border border-black/10 bg-[#faf8fb] px-3.5 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20">
                    <option value="" disabled>Select a customer</option>
                    {customers.map((customer) => <option key={customer.customerId} value={customer.customerId}>{customer.name} · {customer.email}</option>)}
                  </select>
                </label>
                <Field label="Interested vehicle" required value={form.interestedVehicle} onChange={(event) => setForm({ ...form, interestedVehicle: event.target.value })} />
                <label className="block">
                  <span className="label">Status</span>
                  <select required value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as LeadStatus })} className="h-11 w-full rounded-lg border border-black/10 bg-[#faf8fb] px-3.5 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20">
                    {LEAD_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="label">Notes <span className="font-normal text-muted-foreground">(optional)</span></span>
                  <textarea rows={3} value={form.notes ?? ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="w-full resize-y rounded-lg border border-black/10 bg-[#faf8fb] px-3.5 py-3 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20" />
                </label>
                <p className="text-xs text-muted-foreground">Lead ID and tenant assignment are managed by the backend.</p>
                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" disabled={saving} onClick={() => setFormOpen(false)} className="h-11 border-brand-600 px-5 font-semibold text-brand-600 hover:bg-brand-50">Cancel</Button>
                  <Button type="submit" disabled={saving} className="h-11 bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700">
                    {saving && <LoaderCircle size={16} className="animate-spin" />}
                    {saving ? "Saving…" : editingId === null ? "Create lead" : "Save changes"}
                  </Button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
      <SuccessToast message={notice} onDismiss={() => setNotice("")} />
    </main>
  );
}
