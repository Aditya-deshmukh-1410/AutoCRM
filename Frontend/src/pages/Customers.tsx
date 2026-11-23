import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LoaderCircle, Pencil, Plus, Search, Trash2, Users, X } from "lucide-react";
import Field from "../components/Field";
import { Button } from "../components/ui/button";
import { FeedbackMessage, SuccessToast } from "../components/Feedback";
import { handleUnauthorizedResponse } from "../lib/unauthorized";
import AuditHistoryLink from "../components/AuditHistoryLink";
import PageHeader from "../components/PageHeader";

type Customer = {
  customerId: number;
  name: string;
  email: string;
  phone: string;
  address: string | null;
  tenantId: number;
};

type CustomerInput = Pick<Customer, "name" | "email" | "phone"> & { address: string };
type CustomerHistory = {
  leads: Array<{ leadId: number; customerId: number; source: string; status: string; interestedVehicle: string }>;
  activities: Array<{ activityId: number; customerId: number; leadId: number; activityType: string | null; status: string | null; nextFollowUpDate: string | null }>;
  testDrives: Array<{ testDriveId: number; customerId: number; vehicleId: number; scheduledDateTime: string; status: string }>;
  sales: Array<{ saleId: number; customerId: number; vehicleId: number; saleDate: string; saleStatus: string; salePrice: number }>;
  finance: Array<{ financeId: number; customerId: number; saleId: number; financeStatus: string; monthlyEMI: number }>;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: string;
};

const API_BASE_URL = "";
const EMPTY_FORM: CustomerInput = { name: "", email: "", phone: "", address: "" };

async function customerRequest<T>(path: string, token: string, options: RequestOptions = {}): Promise<T> {
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

export default function Customers() {
  const [searchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CustomerInput>(EMPTY_FORM);
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<CustomerHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    let active = true;

    const loadCustomers = async () => {
      try {
        const token = localStorage.getItem("autocrm_token");
        if (!token) {
          throw new Error("Your session has expired. Please log in again.");
        }

        const data = await customerRequest<Customer[]>("/api/customers", token);
        if (!Array.isArray(data)) {
          throw new Error("The customer list response was not valid.");
        }

        if (active) setCustomers(data);
      } catch (requestError) {
        if (active) {
          setLoadError(requestError instanceof Error ? requestError.message : "Failed to load customers.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadCustomers();
    return () => {
      active = false;
    };
  }, []);

  const openCreateForm = () => {
    setError("");
    setNotice("");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditForm = async (customerId: number) => {
    setError("");
    setNotice("");
    setFormLoading(true);
    setFormOpen(true);
    setEditingId(customerId);

    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const customer = await customerRequest<Customer>(`/api/customers/${customerId}`, token);
      setForm({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address ?? "",
      });
    } catch (requestError) {
      setFormOpen(false);
      setError(requestError instanceof Error ? requestError.message : "Failed to load customer.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);

    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const body = JSON.stringify({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });

      if (editingId === null) {
        const created = await customerRequest<Customer>("/api/customers", token, {
          method: "POST",
          body,
        });
        setCustomers((current) => [created, ...current]);
        setNotice("Customer created successfully.");
      } else {
        const updated = await customerRequest<Customer>(`/api/customers/${editingId}`, token, {
          method: "PUT",
          body,
        });
        setCustomers((current) => current.map((customer) =>
          customer.customerId === editingId ? updated : customer
        ));
        setNotice("Customer updated successfully.");
      }

      setFormOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to save customer.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!window.confirm(`Delete ${customer.name}? This action cannot be undone.`)) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const result = await customerRequest<string>(`/api/customers/${customer.customerId}`, token, {
        method: "DELETE",
      });
      setCustomers((current) => current.filter((item) => item.customerId !== customer.customerId));
      setNotice(typeof result === "string" && result ? result : "Customer deleted successfully.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to delete customer.");
    }
  };

  const openHistory = async (customer: Customer) => {
    setHistoryCustomer(customer);
    setHistory(null);
    setHistoryError("");
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const [leads, activities, testDrives, sales, finance] = await Promise.all([
        customerRequest<CustomerHistory["leads"]>("/api/leads", token),
        customerRequest<CustomerHistory["activities"]>("/api/activities", token),
        customerRequest<CustomerHistory["testDrives"]>("/api/test-drives", token),
        customerRequest<CustomerHistory["sales"]>("/api/sales", token),
        customerRequest<CustomerHistory["finance"]>("/api/finance", token),
      ]);
      setHistory({
        leads: leads.filter((item) => item.customerId === customer.customerId),
        activities: activities.filter((item) => item.customerId === customer.customerId),
        testDrives: testDrives.filter((item) => item.customerId === customer.customerId),
        sales: sales.filter((item) => item.customerId === customer.customerId),
        finance: finance.filter((item) => item.customerId === customer.customerId),
      });
    } catch (historyLoadError) {
      setHistoryError(historyLoadError instanceof Error ? historyLoadError.message : "Could not load customer history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer) =>
    [String(customer.customerId), customer.name, customer.email, customer.phone, customer.address]
      .some((value) => (value ?? "").toLowerCase().includes(search.trim().toLowerCase()))
  );

  return (
    <main className="crm-management-page bg-background text-foreground">

      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
        <PageHeader title="Customers" description="Manage buyer and prospective-buyer records. Dealership identity is maintained separately in Dealership Profile." actions={<Button onClick={openCreateForm} size="lg" className="h-11 w-fit rounded-lg bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700"><Plus size={17} /> Add Customer</Button>} />

        <section className="overflow-hidden rounded-xl border border-brand-600/15 bg-white shadow-[0_8px_28px_-24px_rgba(58,6,64,0.45)]">
          <div className="border-b border-brand-600/10 px-4 py-4 sm:px-6">
            <label className="input-wrap h-10 w-full bg-[#faf8fb] sm:ml-auto sm:max-w-sm">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search customers</span>
              <input className="input" type="search" placeholder="Search customers" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
          </div>

          {error && !formOpen && <FeedbackMessage message={error} onDismiss={() => setError("")} className="mx-5 my-4 sm:mx-6" />}

          {loading ? (
            <div role="status" className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground">
              <LoaderCircle size={18} className="animate-spin text-brand-600" /> Loading customers…
            </div>
          ) : loadError ? (
            <div className="px-5 py-10"><FeedbackMessage message={loadError} action={{ label: "Retry", onClick: () => window.location.reload() }} /></div>
          ) : customers.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600"><Users size={22} /></span>
              <h3 className="mt-4 font-display text-lg font-bold text-plum-950">No customers yet</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Add a buyer or prospective buyer. Dealership information belongs in Dealership Profile.</p>
              <Button onClick={openCreateForm} className="mt-5 rounded-lg bg-brand-600 font-semibold text-white hover:bg-brand-700"><Plus size={16} /> Add Customer</Button>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <h3 className="font-display text-lg font-bold text-plum-950">No matching customers</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try another name, email, phone number, or address.</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead className="bg-[#faf7fb] text-xs font-bold uppercase tracking-[0.08em] text-brand-700">
                    <tr>
                      <th className="px-5 py-3.5 sm:px-6">Customer</th>
                      <th className="px-5 py-3.5">Email</th>
                      <th className="px-5 py-3.5">Phone</th>
                      <th className="px-5 py-3.5">Address</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-600/10 text-sm">
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.customerId} className="transition hover:bg-[#fdfafd]">
                        <td className="px-5 py-4 sm:px-6">
                          <p className="font-semibold text-foreground">{customer.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">ID {customer.customerId}</p>
                        </td>
                        <td className="px-5 py-4 text-ink-soft">{customer.email}</td>
                        <td className="px-5 py-4 text-ink-soft">{customer.phone}</td>
                        <td className="max-w-xs px-5 py-4 text-ink-soft">{customer.address ?? "—"}</td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <Link to={`/leads?search=${customer.customerId}`} className="inline-flex items-center rounded-md border border-brand-600/20 px-3 text-xs font-semibold text-brand-700 hover:bg-brand-50">View leads</Link>
                            <Button variant="outline" onClick={() => void openHistory(customer)} className="border-brand-600/20 px-3 text-xs font-semibold text-brand-700 hover:bg-brand-50">History</Button>
                            <AuditHistoryLink entityType="CUSTOMER" entityId={customer.customerId} />
                            <Button variant="outline" size="icon" onClick={() => void openEditForm(customer.customerId)} aria-label={`Edit ${customer.name}`} className="border-brand-600/20 text-brand-700 hover:bg-brand-50"><Pencil size={16} /></Button>
                            <Button variant="outline" size="icon" onClick={() => void handleDelete(customer)} aria-label={`Delete ${customer.name}`} className="border-red-200 text-red-700 hover:bg-red-50"><Trash2 size={16} /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-brand-600/10 sm:hidden">
                {filteredCustomers.map((customer) => (
                  <article key={customer.customerId} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-foreground">{customer.name}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">Customer ID {customer.customerId}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Link to={`/leads?search=${customer.customerId}`} className="inline-flex items-center rounded-md border border-brand-600/20 px-3 text-xs font-semibold text-brand-700 hover:bg-brand-50">Leads</Link>
                        <Button variant="outline" onClick={() => void openHistory(customer)} className="border-brand-600/20 px-3 text-xs font-semibold text-brand-700 hover:bg-brand-50">History</Button>
                        <AuditHistoryLink entityType="CUSTOMER" entityId={customer.customerId} />
                        <Button variant="outline" size="icon" onClick={() => void openEditForm(customer.customerId)} aria-label={`Edit ${customer.name}`} className="border-brand-600/20 text-brand-700 hover:bg-brand-50"><Pencil size={16} /></Button>
                        <Button variant="outline" size="icon" onClick={() => void handleDelete(customer)} aria-label={`Delete ${customer.name}`} className="border-red-200 text-red-700 hover:bg-red-50"><Trash2 size={16} /></Button>
                      </div>
                    </div>
                    <dl className="mt-3 grid gap-2 text-sm">
                      <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Email</dt><dd className="break-all text-ink-soft">{customer.email}</dd></div>
                      <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Phone</dt><dd className="text-ink-soft">{customer.phone}</dd></div>
                      <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Address</dt><dd className="text-ink-soft">{customer.address ?? "—"}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#200024]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving && !formLoading) setFormOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="customer-form-title" className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b5b91]">Customer record</p>
                <h2 id="customer-form-title" className="mt-1 font-display text-2xl font-extrabold text-[#32103a]">{editingId === null ? "Add customer" : "Edit customer"}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setFormOpen(false)} disabled={saving || formLoading} aria-label="Close form" className="text-muted-foreground hover:bg-secondary hover:text-foreground"><X size={19} /></Button>
            </div>

            {error && <FeedbackMessage message={error} onDismiss={() => setError("")} className="mb-4" />}
            {formLoading ? (
              <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin text-[#7b3f8f]" /> Loading customer…</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Name" required autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                <Field label="Email" type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                <Field label="Phone" required autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                <label className="block">
                  <span className="label">Address</span>
                  <textarea required rows={3} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="w-full resize-y rounded-lg border border-black/10 bg-[#faf8fb] px-3.5 py-3 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20" autoComplete="street-address" />
                </label>
                <p className="text-xs text-slate-500">Tenant assignment is handled securely by the backend.</p>
                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" disabled={saving} onClick={() => setFormOpen(false)} className="h-11 border-brand-600 px-5 font-semibold text-brand-600 hover:bg-brand-50">Cancel</Button>
                  <Button type="submit" disabled={saving} className="h-11 bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700">
                    {saving && <LoaderCircle size={16} className="animate-spin" />}
                    {saving ? "Saving…" : editingId === null ? "Create customer" : "Save changes"}
                  </Button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
      {historyCustomer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#200024]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setHistoryCustomer(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="customer-history-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-3xl sm:rounded-2xl sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b5b91]">Customer history</p><h2 id="customer-history-title" className="mt-1 font-display text-xl font-extrabold text-plum-950">{historyCustomer.name}</h2><p className="mt-1 text-sm text-muted-foreground">Customer #{historyCustomer.customerId} · {historyCustomer.email} · {historyCustomer.phone}</p></div><Button type="button" variant="outline" onClick={() => setHistoryCustomer(null)}>Close</Button></div>
            {historyError && <FeedbackMessage message={historyError} action={{ label: "Retry", onClick: () => void openHistory(historyCustomer) }} className="mb-4" />}
            {historyLoading ? <p role="status" className="rounded-lg border bg-slate-50 p-6 text-center text-sm text-muted-foreground">Loading related records…</p> : history && <>
              <p className="mb-4 text-xs leading-5 text-muted-foreground">History includes records returned by the existing role-scoped APIs. A missing item may be outside your permitted worklist.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <section className="rounded-lg border border-brand-600/10 p-4"><h3 className="font-semibold text-plum-950">Leads</h3>{history.leads.length ? <ul className="mt-2 space-y-2">{history.leads.map((item) => <li key={item.leadId}><Link to={`/leads?search=${item.leadId}`} onClick={() => setHistoryCustomer(null)} className="text-sm font-medium text-brand-700 hover:underline">Lead #{item.leadId} · {item.source} · {item.status}</Link><p className="text-xs text-muted-foreground">Interested in {item.interestedVehicle}</p></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No visible leads.</p>}</section>
                <section className="rounded-lg border border-brand-600/10 p-4"><h3 className="font-semibold text-plum-950">Activities & follow-ups</h3>{history.activities.length ? <ul className="mt-2 space-y-2">{history.activities.map((item) => <li key={item.activityId}><Link to={`/activities?search=${item.activityId}`} onClick={() => setHistoryCustomer(null)} className="text-sm font-medium text-brand-700 hover:underline">{item.activityType || "Activity"} #{item.activityId}{item.status ? ` · ${item.status}` : ""}</Link><p className="text-xs text-muted-foreground">Next follow-up: {item.nextFollowUpDate ?? "not set"}</p></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No visible activities.</p>}</section>
                <section className="rounded-lg border border-brand-600/10 p-4"><h3 className="font-semibold text-plum-950">Test drives</h3>{history.testDrives.length ? <ul className="mt-2 space-y-2">{history.testDrives.map((item) => <li key={item.testDriveId}><Link to={`/test-drives?search=${item.testDriveId}`} onClick={() => setHistoryCustomer(null)} className="text-sm font-medium text-brand-700 hover:underline">Appointment #{item.testDriveId} · {item.status}</Link><p className="text-xs text-muted-foreground">{item.scheduledDateTime} · Vehicle #{item.vehicleId}</p></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No visible test drives.</p>}</section>
                <section className="rounded-lg border border-brand-600/10 p-4"><h3 className="font-semibold text-plum-950">Sales</h3>{history.sales.length ? <ul className="mt-2 space-y-2">{history.sales.map((item) => <li key={item.saleId}><Link to={`/sales?search=${item.saleId}`} onClick={() => setHistoryCustomer(null)} className="text-sm font-medium text-brand-700 hover:underline">Sale #{item.saleId} · {item.saleStatus}</Link><p className="text-xs text-muted-foreground">{item.saleDate} · Vehicle #{item.vehicleId}</p></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No visible sales.</p>}</section>
                <section className="rounded-lg border border-brand-600/10 p-4 sm:col-span-2"><h3 className="font-semibold text-plum-950">Finance</h3>{history.finance.length ? <ul className="mt-2 grid gap-2 sm:grid-cols-2">{history.finance.map((item) => <li key={item.financeId}><Link to={`/finance?search=${item.financeId}`} onClick={() => setHistoryCustomer(null)} className="text-sm font-medium text-brand-700 hover:underline">Finance #{item.financeId} · Sale #{item.saleId} · {item.financeStatus}</Link><p className="text-xs text-muted-foreground">Monthly EMI: {item.monthlyEMI}</p></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No visible finance records.</p>}</section>
              </div>
            </>}
          </section>
        </div>
      )}
      <SuccessToast message={notice} onDismiss={() => setNotice("")} />
    </main>
  );
}
