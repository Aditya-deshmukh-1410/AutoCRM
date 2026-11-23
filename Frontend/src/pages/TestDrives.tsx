import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CarFront, LoaderCircle, MessageCircle, Pencil, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import Field from "../components/Field";
import { Button } from "../components/ui/button";
import { FeedbackMessage, SuccessToast } from "../components/Feedback";
import { handleUnauthorizedResponse } from "../lib/unauthorized";
import AssignmentControl from "../components/AssignmentControl";
import PageHeader from "../components/PageHeader";
import { whatsappChatUrl } from "../lib/whatsapp";

type TestDriveStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

type TestDrive = {
  testDriveId: number;
  customerId: number;
  vehicleId: number;
  scheduledDateTime: string;
  status: TestDriveStatus;
  notes: string | null;
  tenantId: number;
  assignedUserId: number | null;
};
type Employee = { userId: number; name: string; email: string; role: string };

type Customer = {
  customerId: number;
  name: string;
  email: string;
  phone: string;
  address: string | null;
  tenantId: number;
};

type Vehicle = {
  vehicleId: number;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  fuelType: string;
  transmission: string;
  kilometers: number;
  price: number;
  color: string | null;
  registrationNumber: string;
  status: string;
  tenantId: number;
};

type TestDriveForm = {
  customerId: string;
  vehicleId: string;
  scheduledDateTime: string;
  status: TestDriveStatus | "";
  notes: string;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: string;
};

const API_BASE_URL = "";
const TEST_DRIVE_STATUSES: TestDriveStatus[] = ["SCHEDULED", "COMPLETED", "CANCELLED"];
const EMPTY_FORM: TestDriveForm = {
  customerId: "",
  vehicleId: "",
  scheduledDateTime: "",
  status: "SCHEDULED",
  notes: "",
};

const STATUS_STYLES: Record<TestDriveStatus, string> = {
  SCHEDULED: "border-brand-300 bg-brand-50 text-brand-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
};

async function testDriveRequest<T>(path: string, token: string, options: RequestOptions = {}): Promise<T> {
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

function statusLabel(status: TestDriveStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatScheduledDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function TestDrives() {
  const routeParams = new URLSearchParams(window.location.search);
  const requestedCustomerId = routeParams.get("new") === "1" ? Number(routeParams.get("customerId")) : NaN;
  const [testDrives, setTestDrives] = useState<TestDrive[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const isAdmin = (() => { try { return JSON.parse(localStorage.getItem("autocrm_user") ?? "null")?.role?.toUpperCase() === "ADMIN"; } catch { return false; } })();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("search") ?? "");
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TestDriveForm>(EMPTY_FORM);

  useEffect(() => {
    let active = true;

    const loadPageData = async () => {
      try {
        const token = localStorage.getItem("autocrm_token");
        if (!token) throw new Error("Your session has expired. Please log in again.");

        const [testDriveData, customerData, vehicleData, employeeData] = await Promise.all([
          testDriveRequest<TestDrive[]>("/api/test-drives", token),
          testDriveRequest<Customer[]>("/api/customers", token),
          testDriveRequest<Vehicle[]>("/api/vehicles", token),
          isAdmin ? testDriveRequest<Employee[]>("/api/users", token) : Promise.resolve([]),
        ]);

        if (!Array.isArray(testDriveData) || !Array.isArray(customerData) || !Array.isArray(vehicleData)) {
          throw new Error("The test drive, customer, or vehicle response was not a valid list.");
        }

        if (active) {
          setTestDrives(testDriveData);
          setCustomers(customerData);
          setVehicles(vehicleData);
          setEmployees(employeeData);
          const requestedCustomer = customerData.find((customer) => customer.customerId === requestedCustomerId);
          if (requestedCustomer) {
            setForm({ ...EMPTY_FORM, customerId: String(requestedCustomer.customerId), vehicleId: vehicleData[0] ? String(vehicleData[0].vehicleId) : "" });
            setFormOpen(true);
          }
        }
      } catch (requestError) {
        if (active) {
          setLoadError(requestError instanceof Error ? requestError.message : "Failed to load test drives.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPageData();
    return () => {
      active = false;
    };
  }, [isAdmin, requestedCustomerId]);

  const openCreateForm = (customerId?: number) => {
    setError("");
    setNotice("");
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      customerId: customers.some((customer) => customer.customerId === customerId) ? String(customerId) : customers[0] ? String(customers[0].customerId) : "",
      vehicleId: vehicles[0] ? String(vehicles[0].vehicleId) : "",
    });
    setFormOpen(true);
  };

  const openEditForm = async (testDriveId: number) => {
    setError("");
    setNotice("");
    setEditingId(testDriveId);
    setFormLoading(true);
    setFormOpen(true);

    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");

      const testDrive = await testDriveRequest<TestDrive>(`/api/test-drives/${testDriveId}`, token);
      setForm({
        customerId: String(testDrive.customerId),
        vehicleId: String(testDrive.vehicleId),
        scheduledDateTime: testDrive.scheduledDateTime.slice(0, 16),
        status: testDrive.status,
        notes: testDrive.notes ?? "",
      });
    } catch (requestError) {
      setFormOpen(false);
      setError(requestError instanceof Error ? requestError.message : "Failed to load test drive.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.customerId || !form.vehicleId || !form.status || !form.scheduledDateTime) {
      setError("Choose a customer, vehicle, date and time, and status.");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");

      const body = JSON.stringify({
        customerId: Number(form.customerId),
        vehicleId: Number(form.vehicleId),
        scheduledDateTime: form.scheduledDateTime,
        status: form.status,
        notes: form.notes.trim() || null,
      });

      if (editingId === null) {
        const created = await testDriveRequest<TestDrive>("/api/test-drives", token, { method: "POST", body });
        if (isAdmin || created.assignedUserId !== null) setTestDrives((current) => [created, ...current]);
        setNotice("Test drive scheduled.");
      } else {
        const updated = await testDriveRequest<TestDrive>(`/api/test-drives/${editingId}`, token, { method: "PUT", body });
        setTestDrives((current) => current.map((item) => item.testDriveId === editingId ? updated : item));
        setNotice("Test drive updated.");
      }

      setFormOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to save test drive.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (testDrive: TestDrive) => {
    if (!window.confirm(`Delete test drive #${testDrive.testDriveId}? This action cannot be undone.`)) return;

    setError("");
    setNotice("");
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");

      const result = await testDriveRequest<string>(`/api/test-drives/${testDrive.testDriveId}`, token, { method: "DELETE" });
      setTestDrives((current) => current.filter((item) => item.testDriveId !== testDrive.testDriveId));
      setNotice(typeof result === "string" && result ? result : "Test drive deleted successfully.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to delete test drive.");
    }
  };

  const handleAssign = async (testDrive: TestDrive, assigneeId: number | null) => {
    try {
      const token = localStorage.getItem("autocrm_token");
      if (!token) throw new Error("Your session has expired. Please log in again.");
      const updated = await testDriveRequest<TestDrive>(`/api/test-drives/${testDrive.testDriveId}/assignment`, token, { method: "PUT", body: JSON.stringify({ assigneeId }) });
      setTestDrives((current) => current.map((item) => item.testDriveId === updated.testDriveId ? updated : item));
      setNotice("Test drive assignment updated.");
    } catch (assignmentError) { setError(assignmentError instanceof Error ? assignmentError.message : "Failed to update assignment."); }
  };

  const customerById = new Map(customers.map((customer) => [customer.customerId, customer]));
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.vehicleId, vehicle]));
  const normalizedSearch = search.trim().toLowerCase();
  const filteredTestDrives = testDrives.filter((item) => {
    const customer = customerById.get(item.customerId);
    const vehicle = vehicleById.get(item.vehicleId);
    return [
      String(item.testDriveId),
      String(item.customerId),
      String(item.vehicleId),
      customer?.name ?? `Customer ${item.customerId}`,
      customer?.email ?? "",
      vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.variant ?? ""}` : `Vehicle ${item.vehicleId}`,
      vehicle?.registrationNumber ?? "",
      item.scheduledDateTime,
      item.status,
      item.notes ?? "",
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
  });

  const vehicleLabel = (vehicleId: number) => {
    const vehicle = vehicleById.get(vehicleId);
    return vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.variant ? ` · ${vehicle.variant}` : ""} (${vehicle.registrationNumber})` : `Vehicle #${vehicleId}`;
  };

  return (
    <main className="crm-management-page bg-background text-foreground">

      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
        <PageHeader title="Test Drives" description="Schedule appointments and track the customer, vehicle, time, status, and assigned employee." actions={<><Button onClick={() => openCreateForm()} size="lg" disabled={customers.length === 0 || vehicles.length === 0} className="h-11 w-fit rounded-lg bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700"><Plus size={17} /> Schedule Test Drive</Button>{!loading && (customers.length === 0 || vehicles.length === 0) && <p className="text-xs text-muted-foreground">Add a customer and vehicle before scheduling.</p>}</>} />

        <section className="overflow-hidden rounded-xl border border-brand-600/15 bg-white shadow-[0_8px_28px_-24px_rgba(58,6,64,0.45)]">
          <div className="border-b border-brand-600/10 px-4 py-4 sm:px-6">
            <label className="input-wrap h-10 w-full bg-[#faf8fb] sm:ml-auto sm:max-w-sm"><Search size={17} aria-hidden="true" /><span className="sr-only">Search test drives</span><input className="input" type="search" placeholder="Search appointments" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          </div>

          {error && !formOpen && testDrives.length > 0 && <FeedbackMessage message={error} onDismiss={() => setError("")} className="mx-5 my-4 sm:mx-6" />}

          {loading ? (
            <div role="status" className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground"><LoaderCircle size={18} className="animate-spin text-brand-600" /> Loading test drives…</div>
          ) : loadError ? (
            <div className="px-5 py-10"><FeedbackMessage message={loadError} action={{ label: "Retry", onClick: () => window.location.reload() }} /></div>
          ) : testDrives.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600"><CalendarClock size={22} /></span>
              <h3 className="mt-4 font-display text-lg font-bold text-plum-950">No test drives yet</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Create an appointment by choosing a customer, one of your vehicles, and a scheduled date and time.</p>
              {customers.length > 0 && vehicles.length > 0 ? (
                <Button onClick={() => openCreateForm()} className="mt-5 rounded-lg bg-brand-600 font-semibold text-white hover:bg-brand-700"><Plus size={16} /> Schedule Test Drive</Button>
              ) : (
                <div className="mt-5 flex justify-center gap-2"><Link to="/customers" className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-50">Customers</Link><Link to="/vehicles" className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-50">Vehicles</Link></div>
              )}
            </div>
          ) : filteredTestDrives.length === 0 ? (
            <div className="px-5 py-14 text-center"><h3 className="font-display text-lg font-bold text-plum-950">No matching appointments</h3><p className="mt-1 text-sm text-muted-foreground">Try another customer, vehicle, date, or status.</p></div>
          ) : (
            <>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[1000px] border-collapse text-left">
                  <thead className="bg-[#faf7fb] text-xs font-bold uppercase tracking-[0.08em] text-brand-700"><tr><th className="px-5 py-3.5 sm:px-6">Customer</th><th className="px-5 py-3.5">Vehicle</th><th className="px-5 py-3.5">Scheduled</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5">Notes</th>{isAdmin && <th className="px-5 py-3.5">Assignment</th>}<th className="px-5 py-3.5 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-brand-600/10 text-sm">
                    {filteredTestDrives.map((item) => (
                      <tr key={item.testDriveId} className="transition hover:bg-[#fdfafd]">
                        <td className="px-5 py-4 sm:px-6"><p className="font-semibold text-foreground"><Link className="hover:text-brand-700 hover:underline" to={`/customers?search=${item.customerId}`}>{customerById.get(item.customerId)?.name ?? `Customer #${item.customerId}`}</Link></p><p className="mt-0.5 text-xs text-muted-foreground">Appointment #{item.testDriveId}</p></td>
                        <td className="max-w-xs px-5 py-4 text-ink-soft"><Link className="hover:text-brand-700 hover:underline" to={`/vehicles/${item.vehicleId}`}>{vehicleLabel(item.vehicleId)}</Link></td>
                        <td className="px-5 py-4 text-ink-soft">{formatScheduledDateTime(item.scheduledDateTime)}</td>
                        <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[item.status]}`}>{statusLabel(item.status)}</span></td>
                        <td className="max-w-xs px-5 py-4 text-ink-soft">{item.notes || "—"}</td>
                        {isAdmin && <td className="px-5 py-4"><AssignmentControl users={employees} assignedUserId={item.assignedUserId} onAssign={(id) => void handleAssign(item, id)} /></td>}
                        <td className="px-5 py-4"><div className="flex justify-end gap-2">{whatsappChatUrl(customerById.get(item.customerId)?.phone ?? "") && <a href={whatsappChatUrl(customerById.get(item.customerId)?.phone ?? "")!} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${customerById.get(item.customerId)?.name ?? "customer"}`} className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><MessageCircle size={14} /> WhatsApp</a>}<Button variant="outline" size="icon" onClick={() => void openEditForm(item.testDriveId)} aria-label={`Edit test drive ${item.testDriveId}`} className="border-brand-600/20 text-brand-700 hover:bg-brand-50"><Pencil size={16} /></Button><Button variant="outline" size="icon" onClick={() => void handleDelete(item)} aria-label={`Delete test drive ${item.testDriveId}`} className="border-red-200 text-red-700 hover:bg-red-50"><Trash2 size={16} /></Button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-brand-600/10 sm:hidden">
                {filteredTestDrives.map((item) => (
                  <article key={item.testDriveId} className="p-4">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold text-foreground"><Link className="hover:text-brand-700 hover:underline" to={`/customers?search=${item.customerId}`}>{customerById.get(item.customerId)?.name ?? `Customer #${item.customerId}`}</Link></h3><p className="mt-0.5 text-xs text-muted-foreground">Appointment #{item.testDriveId}</p></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[item.status]}`}>{statusLabel(item.status)}</span></div>
                    <dl className="mt-3 grid gap-2 text-sm"><div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Vehicle</dt><dd className="text-ink-soft"><Link className="hover:text-brand-700 hover:underline" to={`/vehicles/${item.vehicleId}`}>{vehicleLabel(item.vehicleId)}</Link></dd></div><div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Scheduled</dt><dd className="text-ink-soft">{formatScheduledDateTime(item.scheduledDateTime)}</dd></div>{item.notes && <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Notes</dt><dd className="text-ink-soft">{item.notes}</dd></div>}</dl>
                    {isAdmin && <div className="mt-3"><AssignmentControl users={employees} assignedUserId={item.assignedUserId} onAssign={(id) => void handleAssign(item, id)} /></div>}
                    <div className="mt-3 flex justify-end gap-2">{whatsappChatUrl(customerById.get(item.customerId)?.phone ?? "") && <a href={whatsappChatUrl(customerById.get(item.customerId)?.phone ?? "")!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><MessageCircle size={14} /> WhatsApp</a>}<Button variant="outline" size="icon" onClick={() => void openEditForm(item.testDriveId)} aria-label={`Edit test drive ${item.testDriveId}`} className="border-brand-600/20 text-brand-700 hover:bg-brand-50"><Pencil size={16} /></Button><Button variant="outline" size="icon" onClick={() => void handleDelete(item)} aria-label={`Delete test drive ${item.testDriveId}`} className="border-red-200 text-red-700 hover:bg-red-50"><Trash2 size={16} /></Button></div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#200024]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving && !formLoading) setFormOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="test-drive-form-title" className="max-h-[95vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">Appointment record</p><h2 id="test-drive-form-title" className="mt-1 font-display text-2xl font-extrabold text-plum-950">{editingId === null ? "Schedule test drive" : "Edit test drive"}</h2></div><Button variant="ghost" size="icon" onClick={() => setFormOpen(false)} disabled={saving || formLoading} aria-label="Close form" className="text-muted-foreground hover:bg-secondary hover:text-foreground"><X size={19} /></Button></div>
            {error && <FeedbackMessage message={error} onDismiss={() => setError("")} className="mb-4" />}
            {formLoading ? (
              <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><LoaderCircle size={18} className="animate-spin text-brand-600" /> Loading appointment…</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block"><span className="label">Customer</span><span className="input-wrap bg-[#faf8fb]"><UserRound size={17} /><select required value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })} className="input"><option value="" disabled>Select a customer</option>{customers.map((customer) => <option key={customer.customerId} value={customer.customerId}>{customer.name} · {customer.email}</option>)}</select></span></label>
                <label className="block"><span className="label">Vehicle</span><span className="input-wrap bg-[#faf8fb]"><CarFront size={17} /><select required value={form.vehicleId} onChange={(event) => setForm({ ...form, vehicleId: event.target.value })} className="input"><option value="" disabled>Select a vehicle</option>{vehicles.map((vehicle) => <option key={vehicle.vehicleId} value={vehicle.vehicleId}>{vehicle.year} {vehicle.make} {vehicle.model}{vehicle.variant ? ` · ${vehicle.variant}` : ""} ({vehicle.registrationNumber})</option>)}</select></span></label>
                <Field label="Scheduled date and time" type="datetime-local" required value={form.scheduledDateTime} onChange={(event) => setForm({ ...form, scheduledDateTime: event.target.value })} />
                <label className="block"><span className="label">Status</span><select required value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TestDriveStatus | "" })} className="h-11 w-full rounded-lg border border-black/10 bg-[#faf8fb] px-3.5 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20">{TEST_DRIVE_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
                <label className="block"><span className="label">Notes <span className="font-normal text-muted-foreground">(optional)</span></span><textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="w-full resize-y rounded-lg border border-black/10 bg-[#faf8fb] px-3.5 py-3 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20" /></label>
                <p className="text-xs text-muted-foreground">Appointment ID and tenant assignment are managed by the backend.</p>
                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={saving} onClick={() => setFormOpen(false)} className="h-11 border-brand-600 px-5 font-semibold text-brand-600 hover:bg-brand-50">Cancel</Button><Button type="submit" disabled={saving} className="h-11 bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700">{saving && <LoaderCircle size={16} className="animate-spin" />}{saving ? "Saving…" : editingId === null ? "Schedule test drive" : "Save changes"}</Button></div>
              </form>
            )}
          </section>
        </div>
      )}
      <SuccessToast message={notice} onDismiss={() => setNotice("")} />
    </main>
  );
}
