import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, History, LoaderCircle, Search, X } from "lucide-react";
import { FeedbackMessage } from "../components/Feedback";
import { Button } from "../components/ui/button";
import { handleUnauthorizedResponse } from "../lib/unauthorized";
import PageHeader from "../components/PageHeader";
import {
  AUDIT_CATEGORIES,
  auditActorLabel,
  auditActionLabel,
  auditCategory,
  auditCategoryLabel,
  parseRecordedChanges,
  type AuditRecord,
} from "../lib/auditHistory";

type AuditPageResponse = {
  content: AuditRecord[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  totalEvents: number;
  distinctEmployees: number;
  employees: string[];
  actions: string[];
  entityTypes: string[];
};

type DateRange = "ALL" | "TODAY" | "LAST_7_DAYS";
type Filters = {
  category: string;
  employee: string;
  action: string;
  entityType: string;
  entityId: string;
  dateRange: DateRange;
  search: string;
};

const API_BASE_URL = "";
const PAGE_SIZE = 20;
const EMPTY_PAGE: AuditPageResponse = {
  content: [], page: 0, size: PAGE_SIZE, totalElements: 0, totalPages: 0,
  totalEvents: 0, distinctEmployees: 0, employees: [], actions: [], entityTypes: [],
};

function getStoredRole(): string {
  try {
    const user: unknown = JSON.parse(localStorage.getItem("autocrm_user") ?? "null");
    if (typeof user === "object" && user !== null && "role" in user && typeof user.role === "string") {
      return user.role.toUpperCase();
    }
  } catch {
    return "";
  }
  return "";
}

function initialFilters(params: URLSearchParams): Filters {
  return {
    category: "",
    employee: "",
    action: "",
    entityType: params.get("entityType") ?? "",
    entityId: params.get("entityId") ?? "",
    dateRange: "ALL",
    search: "",
  };
}

function dateBounds(range: DateRange): { from?: string; to?: string } {
  if (range === "ALL") return {};
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "LAST_7_DAYS") start.setDate(start.getDate() - 6);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString();
}

function safeErrorMessage(status: number): string {
  if (status === 403) return "Your account does not have permission to view audit history.";
  if (status === 400) return "Some audit filters are invalid. Review them and try again.";
  return status >= 500
    ? "Audit history is temporarily unavailable. Please retry."
    : `Audit history could not be loaded (HTTP ${status}). Please retry.`;
}

async function loadAuditPage(token: string, filters: Filters, page: number): Promise<AuditPageResponse> {
  const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
  if (filters.category) params.set("category", filters.category);
  if (filters.employee) params.set("employee", filters.employee);
  if (filters.action) params.set("action", filters.action);
  if (filters.entityType) params.set("entityType", filters.entityType);
  if (filters.entityId && /^\d+$/.test(filters.entityId)) params.set("entityId", filters.entityId);
  if (filters.search.trim()) params.set("search", filters.search.trim());
  const bounds = dateBounds(filters.dateRange);
  if (bounds.from) params.set("from", bounds.from);
  if (bounds.to) params.set("to", bounds.to);

  const response = await fetch(`${API_BASE_URL}/api/audit-logs/search?${params.toString()}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (handleUnauthorizedResponse(response)) {
    throw new Error("Your session has expired. Please log in again.");
  }

  const responseText = await response.text();
  let body: unknown = null;
  if (responseText) {
    try {
      body = JSON.parse(responseText);
    } catch {
      body = null;
    }
  }
  if (!response.ok) throw new Error(safeErrorMessage(response.status));
  if (typeof body !== "object" || body === null || !("content" in body) || !Array.isArray(body.content)) {
    throw new Error("The audit history response was not valid.");
  }
  return body as AuditPageResponse;
}

function RecordDetails({ record, onClose }: { record: AuditRecord; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const changes = useMemo(() => record.changeDetails ? parseRecordedChanges(record.changeDetails) : [], [record.changeDetails]);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#200024]/45 p-0 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="audit-detail-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-brand-600/10 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">Audit event</p>
            <h2 id="audit-detail-title" className="mt-1 font-display text-xl font-extrabold text-plum-950">{auditActionLabel(record.action)}</h2>
          </div>
          <Button ref={closeButtonRef} type="button" variant="outline" size="icon" onClick={onClose} aria-label="Close event details" className="border-brand-600/20 text-brand-700"><X size={18} /></Button>
        </div>
        <dl className="grid gap-x-5 sm:grid-cols-2">
          <div className="border-b border-brand-600/10 py-3"><dt className="text-xs font-semibold text-muted-foreground">Actor</dt><dd className="mt-1 break-all text-sm text-ink-soft">{auditActorLabel(record.actorEmail)}</dd></div>
          <div className="border-b border-brand-600/10 py-3"><dt className="text-xs font-semibold text-muted-foreground">Employee role</dt><dd className="mt-1 text-sm text-ink-soft">Not recorded with this event</dd></div>
          <div className="border-b border-brand-600/10 py-3"><dt className="text-xs font-semibold text-muted-foreground">When</dt><dd className="mt-1 text-sm text-ink-soft"><time dateTime={record.timestamp}>{formatTimestamp(record.timestamp)}</time></dd></div>
          <div className="border-b border-brand-600/10 py-3"><dt className="text-xs font-semibold text-muted-foreground">Affected record</dt><dd className="mt-1 text-sm text-ink-soft">{record.entityType} #{record.entityId}</dd></div>
        </dl>
        <section className="mt-5" aria-labelledby="audit-change-title">
          <h3 id="audit-change-title" className="font-semibold text-plum-950">Recorded changes</h3>
          {!record.changeDetails ? (
            <p className="mt-2 rounded-lg border border-dashed border-brand-600/20 bg-[#faf8fb] p-4 text-sm text-muted-foreground">Field-level changes were not recorded for this event.</p>
          ) : (
            <>
              {changes.length > 0 && <dl className="mt-2 divide-y divide-brand-600/10 rounded-lg border border-brand-600/10 px-4">{changes.map((change, index) => <div key={`${change.field}-${index}`} className="grid gap-1 py-3 sm:grid-cols-[1fr_1fr_1fr]"><dt className="text-sm font-semibold text-ink-soft">{change.field}</dt><dd className="text-sm text-muted-foreground"><span className="mr-1 font-medium">Before:</span>{change.before || "—"}</dd><dd className="text-sm text-muted-foreground"><span className="mr-1 font-medium">After:</span>{change.after || "—"}</dd></div>)}</dl>}
              <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-[#faf8fb] p-4 text-sm text-ink-soft">{record.changeDetails}</p>
            </>
          )}
        </section>
        <p className="mt-4 text-xs text-muted-foreground">Employee role is not stored in the audit record. Values above show only details recorded by the backend.</p>
      </section>
    </div>
  );
}

export default function AuditHistory() {
  const role = getStoredRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => initialFilters(searchParams));
  const [appliedFilters, setAppliedFilters] = useState<Filters>(() => initialFilters(searchParams));
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AuditPageResponse>(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null);
  const detailsTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (role !== "ADMIN") return;
    let active = true;
    const load = async () => {
      try {
        const token = localStorage.getItem("autocrm_token");
        if (!token) throw new Error("Your session has expired. Please log in again.");
        const result = await loadAuditPage(token, appliedFilters, page);
        if (active) {
          setData(result);
          setError("");
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Audit history could not be loaded. Please retry.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [role, appliedFilters, page, retryCount]);

  const retry = () => {
    setError("");
    setLoading(true);
    setRetryCount((current) => current + 1);
  };

  const closeDetails = useCallback(() => {
    setSelectedRecord(null);
    window.requestAnimationFrame(() => detailsTriggerRef.current?.focus());
  }, []);

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clean = { ...filters, entityId: filters.entityId.trim(), search: filters.search.trim() };
    setFilters(clean);
    setAppliedFilters(clean);
    setPage(0);
    setLoading(true);
    const params = new URLSearchParams();
    if (clean.entityType) params.set("entityType", clean.entityType);
    if (clean.entityId) params.set("entityId", clean.entityId);
    setSearchParams(params, { replace: true });
  };

  const clearFilters = () => {
    const blank: Filters = { category: "", employee: "", action: "", entityType: "", entityId: "", dateRange: "ALL", search: "" };
    setFilters(blank);
    setAppliedFilters(blank);
    setPage(0);
    setLoading(true);
    setSearchParams({}, { replace: true });
  };

  if (role !== "ADMIN") return <Navigate to="/dashboard" replace />;

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((current) => ({ ...current, [key]: value }));
  const startRecord = data.totalElements === 0 ? 0 : page * PAGE_SIZE + 1;
  const endRecord = Math.min((page + 1) * PAGE_SIZE, data.totalElements);

  return (
    <main className="crm-management-page bg-background text-foreground">
      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
        <PageHeader title="Audit History" description="Review recorded changes by actor, action, date, and affected record." />

        <section aria-label="Audit summary" className="mb-5 grid gap-3 sm:grid-cols-2">
          <article className="rounded-xl border border-brand-600/15 bg-white p-4 shadow-sm"><p className="text-sm font-medium text-muted-foreground">Total audit events</p><p className="mt-1 font-display text-2xl font-extrabold text-plum-950">{loading && data.totalEvents === 0 ? "—" : data.totalEvents.toLocaleString()}</p></article>
          <article className="rounded-xl border border-brand-600/15 bg-white p-4 shadow-sm"><p className="text-sm font-medium text-muted-foreground">Distinct employees</p><p className="mt-1 font-display text-2xl font-extrabold text-plum-950">{loading && data.distinctEmployees === 0 ? "—" : data.distinctEmployees.toLocaleString()}</p></article>
        </section>

        <form onSubmit={applyFilters} className="mb-5 rounded-xl border border-brand-600/15 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block"><span className="label">Category</span><select className="input-wrap h-10 w-full" value={filters.category} onChange={(event) => updateFilter("category", event.target.value)}><option value="">All categories</option>{AUDIT_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="block"><span className="label">Employee</span><select className="input-wrap h-10 w-full" value={filters.employee} onChange={(event) => updateFilter("employee", event.target.value)}><option value="">All employees</option>{data.employees.map((employee) => <option key={employee} value={employee}>{employee}</option>)}</select></label>
            <label className="block"><span className="label">Action</span><select className="input-wrap h-10 w-full" value={filters.action} onChange={(event) => updateFilter("action", event.target.value)}><option value="">All actions</option>{data.actions.map((action) => <option key={action} value={action}>{auditActionLabel(action)}</option>)}</select></label>
            <label className="block"><span className="label">Date range</span><select className="input-wrap h-10 w-full" value={filters.dateRange} onChange={(event) => updateFilter("dateRange", event.target.value as DateRange)}><option value="ALL">All time</option><option value="TODAY">Today</option><option value="LAST_7_DAYS">Last 7 days</option></select></label>
            <label className="block"><span className="label">Record type</span><select className="input-wrap h-10 w-full" value={filters.entityType} onChange={(event) => updateFilter("entityType", event.target.value)}><option value="">All record types</option>{data.entityTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>
            <label className="block"><span className="label">Record ID</span><input className="input-wrap h-10 w-full" inputMode="numeric" pattern="[0-9]*" value={filters.entityId} onChange={(event) => updateFilter("entityId", event.target.value)} placeholder="Any record ID" /></label>
            <label className="block sm:col-span-2"><span className="label">Search</span><span className="input-wrap h-10 w-full bg-[#faf8fb]"><Search size={16} aria-hidden="true" /><input className="input" value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Employee email, action, or record ID" /></span></label>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={clearFilters} className="border-brand-600/20 text-brand-700">Clear filters</Button>
            <Button type="submit" className="bg-brand-600 text-white hover:bg-brand-700">Apply filters</Button>
          </div>
        </form>

        {error && <FeedbackMessage message={error} action={{ label: "Retry", onClick: retry }} className="mb-4" />}
        <section aria-label="Audit events" className="overflow-hidden rounded-xl border border-brand-600/15 bg-white shadow-[0_8px_28px_-24px_rgba(58,6,64,0.45)]">
          {loading ? (
            <div role="status" className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground"><LoaderCircle size={18} className="animate-spin text-brand-600" /> Loading audit history…</div>
          ) : error ? null : data.content.length === 0 ? (
            <div className="px-5 py-16 text-center"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600"><History size={22} aria-hidden="true" /></span><h2 className="mt-4 font-display text-lg font-bold text-plum-950">{data.totalEvents === 0 ? "No audit events yet" : "No matching audit events"}</h2><p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{data.totalEvents === 0 ? "Recorded dealership changes will appear here." : "Try changing or clearing your filters."}</p></div>
          ) : (
            <>
              <ul className="divide-y divide-brand-600/10">
                {data.content.map((record, index) => {
                  const category = auditCategory(record.entityType);
                  return <li key={`${record.timestamp}-${record.action}-${record.entityType}-${record.entityId}-${index}`} className="p-4 transition hover:bg-[#fdfafd] sm:p-5">
                    <article className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><span className="inline-flex rounded-full border border-brand-300/60 bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">{auditCategoryLabel(category)}</span><h2 className="font-semibold text-plum-950">{auditActionLabel(record.action)}</h2><span className="text-xs text-muted-foreground">{record.action}</span></div>
                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft"><span className="break-all">{auditActorLabel(record.actorEmail)}</span><span>{record.entityType} #{record.entityId}</span><time dateTime={record.timestamp}>{formatTimestamp(record.timestamp)}</time></div>
                        <p className="mt-2 line-clamp-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{record.changeDetails || "Field-level changes were not recorded for this event."}</p>
                      </div>
                      <Button type="button" variant="outline" onClick={(event) => { detailsTriggerRef.current = event.currentTarget; setSelectedRecord(record); }} className="min-h-9 border-brand-600/20 px-3 text-xs font-semibold text-brand-700 hover:bg-brand-50">View details</Button>
                    </article>
                  </li>;
                })}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-600/10 px-4 py-3 sm:px-5">
                <p className="text-sm text-muted-foreground">Showing {startRecord}–{endRecord} of {data.totalElements.toLocaleString()} matching events</p>
                <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Page {data.totalPages === 0 ? 0 : page + 1} of {data.totalPages}</span><Button type="button" variant="outline" size="icon" disabled={page <= 0 || loading} onClick={() => { setLoading(true); setPage((current) => Math.max(0, current - 1)); }} aria-label="Previous page" className="border-brand-600/20 text-brand-700"><ChevronLeft size={17} /></Button><Button type="button" variant="outline" size="icon" disabled={page + 1 >= data.totalPages || loading} onClick={() => { setLoading(true); setPage((current) => current + 1); }} aria-label="Next page" className="border-brand-600/20 text-brand-700"><ChevronRight size={17} /></Button></div>
              </div>
            </>
          )}
        </section>
      </div>
      {selectedRecord && <RecordDetails record={selectedRecord} onClose={closeDetails} />}
    </main>
  );
}
