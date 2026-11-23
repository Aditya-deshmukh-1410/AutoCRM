import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CircleDollarSign, LoaderCircle, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import Field from "../components/Field";
import { Button } from "../components/ui/button";
import { FeedbackMessage, SuccessToast } from "../components/Feedback";
import { handleUnauthorizedResponse } from "../lib/unauthorized";
import PageHeader from "../components/PageHeader";

type FinanceRecord = {
  financeId: number;
  saleId: number;
  customerId: number;
  loanAmount: number;
  downPayment: number;
  interestRate: number;
  tenureMonths: number;
  monthlyEMI: number;
  financeStatus: string;
  tenantId: number;
};
type Sale = { saleId: number; customerId: number; vehicleId: number; saleDate: string; salePrice: number; saleStatus: string };
type Customer = { customerId: number; name: string; email: string };
type FinanceForm = { saleId: string; customerId: string; loanAmount: string; downPayment: string; interestRate: string; tenureMonths: string; financeStatus: string };
type RequestOptions = { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: string };

const API_BASE_URL = "";
const EMPTY_FORM: FinanceForm = { saleId: "", customerId: "", loanAmount: "", downPayment: "", interestRate: "", tenureMonths: "", financeStatus: "" };

async function financeRequest<T>(path: string, token: string, options: RequestOptions = {}): Promise<T> {
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

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
}

export default function Finance() {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("search") ?? "");
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FinanceForm>(EMPTY_FORM);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const token = localStorage.getItem("autocrm_token");
        if (!token) throw new Error("Your session has expired. Please log in again.");
        const [financeData, saleData, customerData] = await Promise.all([
          financeRequest<FinanceRecord[]>("/api/finance", token),
          financeRequest<Sale[]>("/api/sales", token),
          financeRequest<Customer[]>("/api/customers", token),
        ]);
        if (!Array.isArray(financeData) || !Array.isArray(saleData) || !Array.isArray(customerData)) {
          throw new Error("The finance, sale, or customer response was not valid.");
        }
        if (active) { setRecords(financeData); setSales(saleData); setCustomers(customerData); }
      } catch (loadError) {
        if (active) setLoadError(loadError instanceof Error ? loadError.message : "Failed to load finance records.");
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, []);

  const customerById = useMemo(() => new Map(customers.map((customer) => [customer.customerId, customer])), [customers]);
  const saleById = useMemo(() => new Map(sales.map((sale) => [sale.saleId, sale])), [sales]);
  const getCustomerLabel = (customerId: number) => customerById.get(customerId)?.name ?? `Customer #${customerId}`;
  const getSaleLabel = (saleId: number) => {
    const sale = saleById.get(saleId);
    return sale ? `Sale #${sale.saleId} · ${getCustomerLabel(sale.customerId)} · ${sale.saleDate}` : `Sale #${saleId}`;
  };
  const filteredRecords = records.filter((record) => [record.financeId, record.saleId, record.customerId, getCustomerLabel(record.customerId), getSaleLabel(record.saleId), record.loanAmount, record.downPayment, record.interestRate, record.tenureMonths, record.monthlyEMI, record.financeStatus].join(" ").toLowerCase().includes(search.trim().toLowerCase()));

  const openCreateForm = () => { setError(""); setNotice(""); setEditingId(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEditForm = async (financeId: number) => {
    setError(""); setNotice(""); setEditingId(financeId); setFormOpen(true); setFormLoading(true);
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const record = await financeRequest<FinanceRecord>(`/api/finance/${financeId}`, token);
      setForm({ saleId: String(record.saleId), customerId: String(record.customerId), loanAmount: String(record.loanAmount), downPayment: String(record.downPayment), interestRate: String(record.interestRate), tenureMonths: String(record.tenureMonths), financeStatus: record.financeStatus });
    } catch (editError) {
      setFormOpen(false); setError(editError instanceof Error ? editError.message : "Failed to load finance record.");
    } finally { setFormLoading(false); }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setNotice(""); setSaving(true);
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const body = JSON.stringify({ saleId: Number(form.saleId), customerId: Number(form.customerId), loanAmount: Number(form.loanAmount), downPayment: Number(form.downPayment), interestRate: Number(form.interestRate), tenureMonths: Number(form.tenureMonths), financeStatus: form.financeStatus.trim() });
      if (editingId === null) {
        const created = await financeRequest<FinanceRecord>("/api/finance", token, { method: "POST", body });
        setRecords((current) => [created, ...current]); setNotice("Finance record created successfully.");
      } else {
        const updated = await financeRequest<FinanceRecord>(`/api/finance/${editingId}`, token, { method: "PUT", body });
        setRecords((current) => current.map((record) => record.financeId === editingId ? updated : record)); setNotice("Finance record updated successfully.");
      }
      setFormOpen(false); setForm(EMPTY_FORM); setEditingId(null);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Failed to save finance record."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (record: FinanceRecord) => {
    if (!window.confirm(`Delete finance record #${record.financeId}? This action cannot be undone.`)) return;
    setError(""); setNotice("");
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const result = await financeRequest<string>(`/api/finance/${record.financeId}`, token, { method: "DELETE" });
      setRecords((current) => current.filter((item) => item.financeId !== record.financeId));
      setNotice(typeof result === "string" && result ? result : "Finance record deleted successfully.");
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Failed to delete finance record."); }
  };

  return (
    <main className="crm-management-page bg-background text-foreground">
      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
        <PageHeader title="Finance & EMI" description="Review loan terms and calculated EMI alongside the linked sale and customer." actions={<Button onClick={openCreateForm} size="lg" className="h-11 w-fit rounded-lg bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700"><Plus size={17} /> Add Finance Record</Button>} />
        <section className="overflow-hidden rounded-xl border border-brand-600/15 bg-white shadow-[0_8px_28px_-24px_rgba(58,6,64,0.45)]">
          <div className="border-b border-brand-600/10 px-4 py-4 sm:px-6"><label className="input-wrap h-10 w-full bg-[#faf8fb] sm:ml-auto sm:max-w-sm"><Search size={17} aria-hidden="true" /><span className="sr-only">Search finance records</span><input className="input" type="search" placeholder="Search finance records" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
          {error && !formOpen && records.length > 0 && <FeedbackMessage message={error} onDismiss={() => setError("")} className="mx-5 my-4 sm:mx-6" />}
          {loading ? <div role="status" className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground"><LoaderCircle size={18} className="animate-spin text-brand-600" /> Loading finance records…</div>
            : loadError ? <div className="px-5 py-10"><FeedbackMessage message={loadError} action={{ label: "Retry", onClick: () => window.location.reload() }} /></div>
              : records.length === 0 ? <div className="px-5 py-16 text-center"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600"><CircleDollarSign size={22} /></span><h3 className="mt-4 font-display text-lg font-bold text-plum-950">No finance records yet</h3><p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Create a record to store finance and EMI details for a sale.</p><Button onClick={openCreateForm} className="mt-5 rounded-lg bg-brand-600 font-semibold text-white hover:bg-brand-700"><Plus size={16} /> Add Finance Record</Button></div>
                : filteredRecords.length === 0 ? <div className="px-5 py-14 text-center"><h3 className="font-display text-lg font-bold text-plum-950">No matching records</h3><p className="mt-1 text-sm text-muted-foreground">Try another customer, sale, or finance status.</p></div>
                  : <><div className="hidden overflow-x-auto xl:block"><table className="w-full min-w-[1120px] border-collapse text-left"><thead className="bg-[#faf7fb] text-xs font-bold uppercase tracking-[0.08em] text-brand-700"><tr><th className="px-5 py-3.5 sm:px-6">Record</th><th className="px-5 py-3.5">Customer</th><th className="px-5 py-3.5">Sale</th><th className="px-5 py-3.5">Loan amount</th><th className="px-5 py-3.5">Down payment</th><th className="px-5 py-3.5">Rate</th><th className="px-5 py-3.5">Tenure</th><th className="px-5 py-3.5">Monthly EMI</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5 text-right">Actions</th></tr></thead><tbody className="divide-y divide-brand-600/10 text-sm">{filteredRecords.map((record) => <tr key={record.financeId} className="transition hover:bg-[#fdfafd]"><td className="px-5 py-4 sm:px-6 font-semibold text-foreground">#{record.financeId}</td><td className="px-5 py-4 text-ink-soft">{getCustomerLabel(record.customerId)}</td><td className="px-5 py-4 text-ink-soft">{getSaleLabel(record.saleId)}</td><td className="px-5 py-4 font-semibold text-plum-900">{formatAmount(record.loanAmount)}</td><td className="px-5 py-4 text-ink-soft">{formatAmount(record.downPayment)}</td><td className="px-5 py-4 text-ink-soft">{record.interestRate}%</td><td className="px-5 py-4 text-ink-soft">{record.tenureMonths} months</td><td className="px-5 py-4 font-semibold text-plum-900">{formatAmount(record.monthlyEMI)}</td><td className="px-5 py-4"><span className="inline-flex rounded-full border border-brand-300/60 bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">{record.financeStatus}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><Button variant="outline" size="icon" onClick={() => void openEditForm(record.financeId)} aria-label={`Edit finance record ${record.financeId}`} className="border-brand-600/20 text-brand-700 hover:bg-brand-50"><Pencil size={16} /></Button><Button variant="outline" size="icon" onClick={() => void handleDelete(record)} aria-label={`Delete finance record ${record.financeId}`} className="border-red-200 text-red-700 hover:bg-red-50"><Trash2 size={16} /></Button></div></td></tr>)}</tbody></table></div>
                    <div className="divide-y divide-brand-600/10 xl:hidden">{filteredRecords.map((record) => <article key={record.financeId} className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold text-foreground">Finance record #{record.financeId}</h3><p className="mt-1 truncate text-sm text-ink-soft">{getCustomerLabel(record.customerId)}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{getSaleLabel(record.saleId)}</p></div><div className="flex shrink-0 gap-2"><Button variant="outline" size="icon" onClick={() => void openEditForm(record.financeId)} aria-label={`Edit finance record ${record.financeId}`} className="border-brand-600/20 text-brand-700 hover:bg-brand-50"><Pencil size={16} /></Button><Button variant="outline" size="icon" onClick={() => void handleDelete(record)} aria-label={`Delete finance record ${record.financeId}`} className="border-red-200 text-red-700 hover:bg-red-50"><Trash2 size={16} /></Button></div></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Loan amount</dt><dd className="font-semibold text-plum-900">{formatAmount(record.loanAmount)}</dd></div><div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Monthly EMI</dt><dd className="font-semibold text-plum-900">{formatAmount(record.monthlyEMI)}</dd></div><div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Down payment</dt><dd className="text-ink-soft">{formatAmount(record.downPayment)}</dd></div><div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Interest rate</dt><dd className="text-ink-soft">{record.interestRate}%</dd></div><div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tenure</dt><dd className="text-ink-soft">{record.tenureMonths} months</dd></div><div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</dt><dd className="mt-1"><span className="inline-flex rounded-full border border-brand-300/60 bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">{record.financeStatus}</span></dd></div></dl></article>)}</div></>}
        </section>
      </div>

      {formOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#200024]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving && !formLoading) setFormOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="finance-form-title" className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-7"><div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b5b91]">Finance record</p><h2 id="finance-form-title" className="mt-1 font-display text-2xl font-extrabold text-[#32103a]">{editingId === null ? "Add finance record" : "Edit finance record"}</h2></div><Button variant="ghost" size="icon" onClick={() => setFormOpen(false)} disabled={saving || formLoading} aria-label="Close form" className="text-muted-foreground hover:bg-secondary hover:text-foreground"><X size={19} /></Button></div>
        {error && <FeedbackMessage message={error} onDismiss={() => setError("")} className="mb-4" />}
        {formLoading ? <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin text-[#7b3f8f]" /> Loading finance record…</div> : <form onSubmit={handleSubmit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="label">Sale</span><select required value={form.saleId} onChange={(event) => setForm({ ...form, saleId: event.target.value })} className="input-wrap h-11 w-full bg-[#faf8fb] text-sm"><option value="">Select a sale</option>{sales.map((sale) => <option key={sale.saleId} value={sale.saleId}>{getSaleLabel(sale.saleId)} · {sale.saleStatus}</option>)}</select></label><label className="block"><span className="label">Customer</span><select required value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })} className="input-wrap h-11 w-full bg-[#faf8fb] text-sm"><option value="">Select a customer</option>{customers.map((customer) => <option key={customer.customerId} value={customer.customerId}>{customer.name} · {customer.email}</option>)}</select></label><Field label="Loan amount" type="number" min="0.01" step="0.01" required value={form.loanAmount} onChange={(event) => setForm({ ...form, loanAmount: event.target.value })} prefix="₹" /><Field label="Down payment" type="number" min="0" step="0.01" required value={form.downPayment} onChange={(event) => setForm({ ...form, downPayment: event.target.value })} prefix="₹" /><Field label="Annual interest rate (%)" type="number" min="0" step="0.01" required value={form.interestRate} onChange={(event) => setForm({ ...form, interestRate: event.target.value })} hint="Enter 0 for an interest-free calculation." /><Field label="Tenure (months)" type="number" min="1" step="1" required value={form.tenureMonths} onChange={(event) => setForm({ ...form, tenureMonths: event.target.value })} /><Field label="Finance status" required value={form.financeStatus} onChange={(event) => setForm({ ...form, financeStatus: event.target.value })} hint="Status is stored as provided by the backend; no fixed status values are defined there." /></div><p className="text-xs leading-5 text-slate-500">Finance ID, tenant assignment, and monthly EMI are handled by the backend. EMI is recalculated when the record is saved.</p><div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={saving} onClick={() => setFormOpen(false)} className="h-11 border-brand-600 px-5 font-semibold text-brand-600 hover:bg-brand-50">Cancel</Button><Button type="submit" disabled={saving || customers.length === 0 || sales.length === 0} className="h-11 bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700">{saving && <LoaderCircle size={16} className="animate-spin" />}{saving ? "Saving…" : editingId === null ? "Create record" : "Save changes"}</Button></div></form>}</section></div>}
      <SuccessToast message={notice} onDismiss={() => setNotice("")} />
    </main>
  );
}
