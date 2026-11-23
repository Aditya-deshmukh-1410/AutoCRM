import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CircleDollarSign, LoaderCircle, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import Field from "../components/Field";
import { Button } from "../components/ui/button";
import { FeedbackMessage, SuccessToast } from "../components/Feedback";
import { handleUnauthorizedResponse } from "../lib/unauthorized";
import PageHeader from "../components/PageHeader";

type SaleStatus = "DRAFT" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
type PaymentStatus = "PENDING" | "PARTIAL" | "PAID";
type Sale = {
  saleId: number;
  customerId: number;
  vehicleId: number;
  saleDate: string;
  salePrice: number;
  paymentStatus: PaymentStatus;
  saleStatus: SaleStatus;
  notes: string | null;
  tenantId: number;
};
type Customer = { customerId: number; name: string; email: string; phone: string; address: string | null; tenantId: number };
type Vehicle = { vehicleId: number; make: string; model: string; variant: string | null; year: number; registrationNumber: string; status: string; tenantId: number };
type SaleForm = { customerId: string; vehicleId: string; saleDate: string; salePrice: string; paymentStatus: PaymentStatus | ""; saleStatus: SaleStatus | ""; notes: string };
type RequestOptions = { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: string };

const API_BASE_URL = "";
const SALE_STATUSES: SaleStatus[] = ["DRAFT", "CONFIRMED", "COMPLETED", "CANCELLED"];
const PAYMENT_STATUSES: PaymentStatus[] = ["PENDING", "PARTIAL", "PAID"];
const EMPTY_FORM: SaleForm = { customerId: "", vehicleId: "", saleDate: "", salePrice: "", paymentStatus: "PENDING", saleStatus: "DRAFT", notes: "" };
const SALE_STATUS_STYLES: Record<SaleStatus, string> = {
  DRAFT: "border-slate-200 bg-slate-50 text-slate-700",
  CONFIRMED: "border-brand-300 bg-brand-50 text-brand-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
};
const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  PARTIAL: "border-brand-300 bg-brand-50 text-brand-700",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

async function saleRequest<T>(path: string, token: string, options: RequestOptions = {}): Promise<T> {
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

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
}

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("search") ?? "");
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SaleForm>(EMPTY_FORM);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const token = localStorage.getItem("autocrm_token");
        if (!token) throw new Error("Your session has expired. Please log in again.");
        const [saleData, customerData, vehicleData] = await Promise.all([
          saleRequest<Sale[]>("/api/sales", token),
          saleRequest<Customer[]>("/api/customers", token),
          saleRequest<Vehicle[]>("/api/vehicles", token),
        ]);
        if (!Array.isArray(saleData) || !Array.isArray(customerData) || !Array.isArray(vehicleData)) {
          throw new Error("The sales, customer, or vehicle response was not valid.");
        }
        if (active) { setSales(saleData); setCustomers(customerData); setVehicles(vehicleData); }
      } catch (loadError) {
        if (active) setLoadError(loadError instanceof Error ? loadError.message : "Failed to load sales.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const customerById = useMemo(() => new Map(customers.map((item) => [item.customerId, item])), [customers]);
  const vehicleById = useMemo(() => new Map(vehicles.map((item) => [item.vehicleId, item])), [vehicles]);
  const filteredSales = sales.filter((sale) => {
    const customer = customerById.get(sale.customerId);
    const vehicle = vehicleById.get(sale.vehicleId);
    const text = [sale.saleId, sale.customerId, sale.vehicleId, sale.saleDate, sale.salePrice, sale.paymentStatus, sale.saleStatus, sale.notes ?? "", customer?.name ?? "", customer?.email ?? "", vehicle?.make ?? "", vehicle?.model ?? "", vehicle?.registrationNumber ?? ""].join(" ").toLowerCase();
    return text.includes(search.trim().toLowerCase());
  });

  const openCreateForm = () => {
    setError(""); setNotice(""); setEditingId(null); setForm(EMPTY_FORM); setFormOpen(true);
  };

  const openEditForm = async (saleId: number) => {
    setError(""); setNotice(""); setEditingId(saleId); setFormOpen(true); setFormLoading(true);
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const sale = await saleRequest<Sale>(`/api/sales/${saleId}`, token);
      setForm({ customerId: String(sale.customerId), vehicleId: String(sale.vehicleId), saleDate: sale.saleDate, salePrice: String(sale.salePrice), paymentStatus: sale.paymentStatus, saleStatus: sale.saleStatus, notes: sale.notes ?? "" });
    } catch (editError) {
      setFormOpen(false); setError(editError instanceof Error ? editError.message : "Failed to load sale.");
    } finally { setFormLoading(false); }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setNotice(""); setSaving(true);
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const body = JSON.stringify({ customerId: Number(form.customerId), vehicleId: Number(form.vehicleId), saleDate: form.saleDate, salePrice: Number(form.salePrice), paymentStatus: form.paymentStatus, saleStatus: form.saleStatus, notes: form.notes.trim() || null });
      if (editingId === null) {
        const created = await saleRequest<Sale>("/api/sales", token, { method: "POST", body });
        setSales((current) => [created, ...current]); setNotice("Sale created successfully.");
      } else {
        const updated = await saleRequest<Sale>(`/api/sales/${editingId}`, token, { method: "PUT", body });
        setSales((current) => current.map((sale) => sale.saleId === editingId ? updated : sale)); setNotice("Sale updated successfully.");
      }
      setFormOpen(false); setForm(EMPTY_FORM); setEditingId(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save sale.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (sale: Sale) => {
    if (!window.confirm(`Delete sale #${sale.saleId}?${sale.saleStatus === "COMPLETED" ? " The backend will return its vehicle to AVAILABLE." : " This action cannot be undone."}`)) return;
    setError(""); setNotice("");
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const result = await saleRequest<string>(`/api/sales/${sale.saleId}`, token, { method: "DELETE" });
      setSales((current) => current.filter((item) => item.saleId !== sale.saleId));
      setNotice(typeof result === "string" && result ? result : "Sale deleted successfully.");
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Failed to delete sale."); }
  };
  const vehicleLabel = (vehicleId: number) => {
    const vehicle = vehicleById.get(vehicleId);
    return vehicle
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.variant ? ` ${vehicle.variant}` : ""} · ${vehicle.registrationNumber}`
      : `Vehicle #${vehicleId}`;
  };
  const customerLabel = (customerId: number) => customerById.get(customerId)?.name ?? `Customer #${customerId}`;

  return (
    <main className="crm-management-page bg-background text-foreground">

      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
        <PageHeader title="Sales" description="Manage the sale lifecycle, customer and vehicle links, payment status, and completion." actions={<Button onClick={openCreateForm} size="lg" className="h-11 w-fit rounded-lg bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700"><Plus size={17} /> Add Sale</Button>} />

        <section className="overflow-hidden rounded-xl border border-brand-600/15 bg-white shadow-[0_8px_28px_-24px_rgba(58,6,64,0.45)]">
          <div className="border-b border-brand-600/10 px-4 py-4 sm:px-6"><label className="input-wrap h-10 w-full bg-[#faf8fb] sm:ml-auto sm:max-w-sm"><Search size={17} aria-hidden="true" /><span className="sr-only">Search sales</span><input className="input" type="search" placeholder="Search sales" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
          {error && !formOpen && sales.length > 0 && <FeedbackMessage message={error} onDismiss={() => setError("")} className="mx-5 my-4 sm:mx-6" />}
          {loading ? <div role="status" className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground"><LoaderCircle size={18} className="animate-spin text-brand-600" /> Loading sales…</div>
            : loadError ? <div className="px-5 py-10"><FeedbackMessage message={loadError} action={{ label: "Retry", onClick: () => window.location.reload() }} /></div>
              : sales.length === 0 ? <div className="px-5 py-16 text-center"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600"><CircleDollarSign size={22} /></span><h3 className="mt-4 font-display text-lg font-bold text-plum-950">No sales yet</h3><p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Sale records will appear here once created.</p><Button onClick={openCreateForm} className="mt-5 rounded-lg bg-brand-600 font-semibold text-white hover:bg-brand-700"><Plus size={16} /> Add Sale</Button></div>
                : filteredSales.length === 0 ? <div className="px-5 py-14 text-center"><h3 className="font-display text-lg font-bold text-plum-950">No matching sales</h3><p className="mt-1 text-sm text-muted-foreground">Try another customer, vehicle, date, or status.</p></div>
                  : <>
                    <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1080px] border-collapse text-left"><thead className="bg-[#faf7fb] text-xs font-bold uppercase tracking-[0.08em] text-brand-700"><tr><th className="px-5 py-3.5 sm:px-6">Sale</th><th className="px-5 py-3.5">Customer</th><th className="px-5 py-3.5">Vehicle</th><th className="px-5 py-3.5">Date</th><th className="px-5 py-3.5">Sale price</th><th className="px-5 py-3.5">Payment</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5 text-right">Actions</th></tr></thead><tbody className="divide-y divide-brand-600/10 text-sm">{filteredSales.map((sale) => <tr key={sale.saleId} className="transition hover:bg-[#fdfafd]"><td className="px-5 py-4 sm:px-6"><p className="font-semibold text-foreground">Sale #{sale.saleId}</p>{sale.notes && <p className="mt-0.5 max-w-40 truncate text-xs text-muted-foreground" title={sale.notes}>{sale.notes}</p>}</td><td className="px-5 py-4 text-ink-soft"><Link className="hover:text-brand-700 hover:underline" to={`/customers?search=${sale.customerId}`}>{customerLabel(sale.customerId)}</Link></td><td className="max-w-xs px-5 py-4 text-ink-soft"><Link className="hover:text-brand-700 hover:underline" to={`/vehicles/${sale.vehicleId}`}>{vehicleLabel(sale.vehicleId)}</Link></td><td className="px-5 py-4 text-ink-soft">{sale.saleDate}</td><td className="px-5 py-4 font-semibold text-plum-900">{formatPrice(sale.salePrice)}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${PAYMENT_STATUS_STYLES[sale.paymentStatus]}`}>{sale.paymentStatus}</span></td><td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${SALE_STATUS_STYLES[sale.saleStatus]}`}>{sale.saleStatus}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><Button variant="outline" size="icon" onClick={() => void openEditForm(sale.saleId)} aria-label={`Edit sale ${sale.saleId}`} className="border-brand-600/20 text-brand-700 hover:bg-brand-50"><Pencil size={16} /></Button><Button variant="outline" size="icon" onClick={() => void handleDelete(sale)} aria-label={`Delete sale ${sale.saleId}`} className="border-red-200 text-red-700 hover:bg-red-50"><Trash2 size={16} /></Button></div></td></tr>)}</tbody></table></div>
                    <div className="divide-y divide-brand-600/10 lg:hidden">{filteredSales.map((sale) => <article key={sale.saleId} className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold text-foreground">Sale #{sale.saleId}</h3><p className="mt-1 truncate text-sm text-ink-soft"><Link className="hover:text-brand-700 hover:underline" to={`/customers?search=${sale.customerId}`}>{customerLabel(sale.customerId)}</Link></p><p className="mt-0.5 truncate text-xs text-muted-foreground"><Link className="hover:text-brand-700 hover:underline" to={`/vehicles/${sale.vehicleId}`}>{vehicleLabel(sale.vehicleId)}</Link></p></div><div className="flex shrink-0 gap-2"><Button variant="outline" size="icon" onClick={() => void openEditForm(sale.saleId)} aria-label={`Edit sale ${sale.saleId}`} className="border-brand-600/20 text-brand-700 hover:bg-brand-50"><Pencil size={16} /></Button><Button variant="outline" size="icon" onClick={() => void handleDelete(sale)} aria-label={`Delete sale ${sale.saleId}`} className="border-red-200 text-red-700 hover:bg-red-50"><Trash2 size={16} /></Button></div></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sale date</dt><dd className="text-ink-soft">{sale.saleDate}</dd></div><div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sale price</dt><dd className="font-semibold text-plum-900">{formatPrice(sale.salePrice)}</dd></div><div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Payment</dt><dd className="mt-1"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${PAYMENT_STATUS_STYLES[sale.paymentStatus]}`}>{sale.paymentStatus}</span></dd></div><div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</dt><dd className="mt-1"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${SALE_STATUS_STYLES[sale.saleStatus]}`}>{sale.saleStatus}</span></dd></div>{sale.notes && <div className="col-span-2"><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Notes</dt><dd className="text-ink-soft">{sale.notes}</dd></div>}</dl></article>)}</div>
                  </>}
        </section>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">Vehicle availability and completed-sale protection are enforced by the backend.</p>
      </div>

      {formOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#200024]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving && !formLoading) setFormOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="sale-form-title" className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-7"><div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b5b91]">Sale record</p><h2 id="sale-form-title" className="mt-1 font-display text-2xl font-extrabold text-[#32103a]">{editingId === null ? "Add sale" : "Edit sale"}</h2></div><Button variant="ghost" size="icon" onClick={() => setFormOpen(false)} disabled={saving || formLoading} aria-label="Close form" className="text-muted-foreground hover:bg-secondary hover:text-foreground"><X size={19} /></Button></div>
        {error && <FeedbackMessage message={error} onDismiss={() => setError("")} className="mb-4" />}
        {formLoading ? <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin text-[#7b3f8f]" /> Loading sale…</div> : <form onSubmit={handleSubmit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="label">Customer</span><select required value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })} className="input-wrap h-11 w-full bg-[#faf8fb] text-sm"><option value="">Select a customer</option>{customers.map((customer) => <option key={customer.customerId} value={customer.customerId}>{customer.name} · {customer.email}</option>)}</select></label><label className="block"><span className="label">Vehicle</span><select required value={form.vehicleId} onChange={(event) => setForm({ ...form, vehicleId: event.target.value })} className="input-wrap h-11 w-full bg-[#faf8fb] text-sm"><option value="">Select a vehicle</option>{vehicles.filter((vehicle) => editingId !== null || vehicle.status === "AVAILABLE").map((vehicle) => <option key={vehicle.vehicleId} value={vehicle.vehicleId}>{vehicleLabel(vehicle.vehicleId)} · {vehicle.status}</option>)}</select><span className="mt-1 block text-xs text-slate-500">New sales can select vehicles currently marked AVAILABLE.</span></label><Field label="Sale date" type="date" required value={form.saleDate} onChange={(event) => setForm({ ...form, saleDate: event.target.value })} /><Field label="Sale price" type="number" min="0.01" step="0.01" required value={form.salePrice} onChange={(event) => setForm({ ...form, salePrice: event.target.value })} prefix="₹" /><label className="block"><span className="label">Sale status</span><select required value={form.saleStatus} onChange={(event) => setForm({ ...form, saleStatus: event.target.value as SaleStatus })} className="input-wrap h-11 w-full bg-[#faf8fb] text-sm">{SALE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label className="block"><span className="label">Payment status</span><select required value={form.paymentStatus} onChange={(event) => setForm({ ...form, paymentStatus: event.target.value as PaymentStatus })} className="input-wrap h-11 w-full bg-[#faf8fb] text-sm">{PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label></div><label className="block"><span className="label">Notes</span><textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="w-full resize-y rounded-lg border border-black/10 bg-[#faf8fb] px-3.5 py-3 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20" /></label><p className="text-xs leading-5 text-slate-500">Sale ID and tenant assignment are handled by the backend. Vehicle eligibility and sale rules are validated when you save.</p><div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={saving} onClick={() => setFormOpen(false)} className="h-11 border-brand-600 px-5 font-semibold text-brand-600 hover:bg-brand-50">Cancel</Button><Button type="submit" disabled={saving || customers.length === 0 || vehicles.length === 0} className="h-11 bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700">{saving && <LoaderCircle size={16} className="animate-spin" />}{saving ? "Saving…" : editingId === null ? "Create sale" : "Save changes"}</Button></div></form>}</section></div>}
      <SuccessToast message={notice} onDismiss={() => setNotice("")} />
    </main>
  );
}
