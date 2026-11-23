import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FeedbackMessage } from "../components/Feedback";
import { handleUnauthorizedResponse } from "../lib/unauthorized";
import PageHeader from "../components/PageHeader";
import {
  CalendarClock,
  CarFront,
  ClipboardCheck,
  CircleCheck,
  UserRound,
  Bell,
  Tag,
} from "lucide-react";

type LoggedInUser = {
  userId: number;
  email: string;
  role: string;
  tenantId: number;
};

type VehicleRecord = { vehicleId: number; status: string };
type SaleRecord = { saleId: number; customerId: number; vehicleId: number; saleStatus: string; paymentStatus: string; salePrice: number; saleDate: string };
type LeadRecord = { leadId: number; status: string; source: string; interestedVehicle: string; customerId: number };
type TestDriveRecord = { testDriveId: number; customerId: number; vehicleId: number; scheduledDateTime: string; status: string };
type CustomerRecord = { customerId: number; name: string };
type VehicleSummary = VehicleRecord & { make: string; model: string; year: number };
type ActivityRecord = {
  activityId: number;
  customerId: number;
  leadId: number;
  activityType: string | null;
  status: string | null;
  nextFollowUpDate: string | null;
};
type DashboardSnapshot = {
  vehicles: VehicleSummary[];
  sales: SaleRecord[];
  activities: ActivityRecord[];
  leads: LeadRecord[];
  testDrives: TestDriveRecord[];
  customers: CustomerRecord[];
  sellRequests: { status: string; expectedPrice: number | null }[];
  unreadNotifications: number;
};

const API_BASE_URL = "";

function readStoredUser(): LoggedInUser | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem("autocrm_user") ?? "null");
    if (
      typeof parsed === "object" && parsed !== null &&
      "userId" in parsed && typeof parsed.userId === "number" &&
      "email" in parsed && typeof parsed.email === "string" &&
      "role" in parsed && typeof parsed.role === "string" &&
      "tenantId" in parsed && typeof parsed.tenantId === "number"
    ) return parsed as LoggedInUser;
  } catch {
    return null;
  }
  return null;
}

function getApiError(payload: unknown, status: number): string {
  if (typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }
  return `Dashboard data could not be loaded (HTTP ${status}). Please retry.`;
}

async function dashboardRequest<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (handleUnauthorizedResponse(response)) {
    throw new Error("Your session has expired. Please log in again.");
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }
  if (!response.ok) throw new Error(getApiError(payload, response.status));
  if (payload === null) throw new Error("The dashboard returned an empty response. Please retry.");
  return payload as T;
}

function formatDate(dateValue: string): string {
  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) return dateValue;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(year, month - 1, day));
}

function formatDateTime(dateValue: string): string {
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime())
    ? dateValue
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user] = useState<LoggedInUser | null>(readStoredUser);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    const loadDashboard = async () => {
      const storedUser = localStorage.getItem("autocrm_user");
      const token = localStorage.getItem("autocrm_token");
      if (!token || !storedUser || !user) {
        if (token && storedUser && !user) {
          localStorage.removeItem("autocrm_token");
          localStorage.removeItem("autocrm_user");
        }
        navigate("/login", { replace: true });
        return;
      }

      try {
        const [vehicles, sales, activities, leads, testDrives, customers] = await Promise.all([
          dashboardRequest<VehicleSummary[]>("/api/vehicles", token),
          dashboardRequest<SaleRecord[]>("/api/sales", token),
          dashboardRequest<ActivityRecord[]>("/api/activities", token),
          dashboardRequest<LeadRecord[]>("/api/leads", token),
          dashboardRequest<TestDriveRecord[]>("/api/test-drives", token),
          dashboardRequest<CustomerRecord[]>("/api/customers", token),
        ]);
        if (![vehicles, sales, activities, leads, testDrives, customers].every(Array.isArray)) {
          throw new Error("The dashboard received an unexpected response. Please retry.");
        }
        let sellRequests: DashboardSnapshot["sellRequests"] = [];
        let unreadNotifications = 0;
        const [sellRequestRows, notificationSummary] = await Promise.all([
          dashboardRequest<DashboardSnapshot["sellRequests"]>("/api/crm/sell-requests", token),
          dashboardRequest<{ unread: number }>("/api/crm/notifications", token),
        ]);
        sellRequests = sellRequestRows;
        unreadNotifications = notificationSummary.unread;
        if (active) setSnapshot({ vehicles, sales, activities, leads, testDrives, customers, sellRequests, unreadNotifications });
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Dashboard data could not be loaded. Please retry.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadDashboard();
    return () => { active = false; };
  }, [navigate, retryKey, user]);

  const retryDashboard = () => {
    setError("");
    setLoading(true);
    setRetryKey((current) => current + 1);
  };

  if (!user) return null;

  const vehicles = snapshot?.vehicles ?? [];
  const sales = snapshot?.sales ?? [];
  const activities = snapshot?.activities ?? [];
  const leads = snapshot?.leads ?? [];
  const testDrives = snapshot?.testDrives ?? [];
  const currentTime = new Date().getTime();
  const availableVehicles = vehicles.filter((vehicle) => vehicle.status?.toUpperCase() === "AVAILABLE").length;
  const soldVehicles = vehicles.filter((vehicle) => vehicle.status?.toUpperCase() === "SOLD").length;
  const activeLeads = leads.filter((lead) => !["CONVERTED", "LOST"].includes(lead.status.toUpperCase()));
  const upcomingTestDrives = testDrives
    .filter((testDrive) => testDrive.status.toUpperCase() === "SCHEDULED" && new Date(testDrive.scheduledDateTime).getTime() >= currentTime)
    .sort((left, right) => left.scheduledDateTime.localeCompare(right.scheduledDateTime));
  const today = localDateKey(new Date());
  const dueFollowUps = activities
    .filter((activity) => Boolean(activity.nextFollowUpDate) && activity.nextFollowUpDate! <= today)
    .sort((left, right) => (left.nextFollowUpDate ?? "").localeCompare(right.nextFollowUpDate ?? ""));
  const customerNames = new Map((snapshot?.customers ?? []).map((customer) => [customer.customerId, customer.name]));
  const vehiclesById = new Map(vehicles.map((vehicle) => [vehicle.vehicleId, vehicle]));
  const leadsById = new Map(leads.map((lead) => [lead.leadId, lead]));
  const recentSales = [...sales].sort((left, right) => right.saleDate.localeCompare(left.saleDate)).slice(0, 5);
  const newSellRequests = (snapshot?.sellRequests ?? []).filter((request) => request.status.toUpperCase() === "NEW").length;
  const openSellPipeline = (snapshot?.sellRequests ?? [])
    .filter((request) => ["NEW", "CONTACTED", "OFFER_MADE"].includes(request.status.toUpperCase()))
    .reduce((total, request) => total + (request.expectedPrice ?? 0), 0);

  const primaryMetrics = [
    { title: "Available vehicles", value: availableVehicles, detail: `${vehicles.length} vehicles in inventory`, icon: CarFront, href: "/vehicles", tone: "green" },
    { title: "Vehicles sold", value: soldVehicles, detail: "Current inventory status", icon: CircleCheck, href: "/vehicles", tone: "blue" },
    { title: "Active leads", value: activeLeads.length, detail: "In your accessible worklist", icon: UserRound, href: "/leads", tone: "plum" },
    { title: "Upcoming test drives", value: upcomingTestDrives.length, detail: "Scheduled and awaiting completion", icon: ClipboardCheck, href: "/test-drives", tone: "blue" },
    { title: "Follow-ups due", value: dueFollowUps.length, detail: "Due today or past due", icon: CalendarClock, href: "/activities", tone: "amber" },
    { title: "New sell requests", value: newSellRequests, detail: `${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(openSellPipeline)} open pipeline`, icon: Tag, href: "/sell-requests", tone: "amber" },
    { title: "Unread website activity", value: snapshot?.unreadNotifications ?? 0, detail: "Enquiries, bookings, and seller requests", icon: Bell, href: "/notifications", tone: "plum" },
  ] as const;

  return (
    <main id="overview" className="min-w-0 flex-1">
      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
        <PageHeader title="Dashboard" description="Prioritized work and operational signals from the records available to you." eyebrow={`Today · ${formatDate(today)}`} />

        {error && <FeedbackMessage message={error} action={{ label: "Retry", onClick: retryDashboard }} className="mb-5" />}

        {loading && (
          <div role="status" className="rounded-xl border border-[#eadfec] bg-white px-5 py-6 text-sm text-slate-500 shadow-sm">
            Loading dealership overview…
          </div>
        )}

        {snapshot && !loading && (
          <div className="space-y-7">
            <section aria-label="Key dealership metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {primaryMetrics.map(({ title, value, detail, icon: Icon, href, tone }) => {
                const iconTone = tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "blue" ? "bg-sky-50 text-sky-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-[#f5edf6] text-[#7b3f8f]";
                return (
                  <Link key={title} to={href} className="rounded-xl border border-[#eadfec] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#d6bfd9] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-500">{title}</p>
                      <span className={`grid size-10 place-items-center rounded-xl ${iconTone}`}><Icon size={19} aria-hidden="true" /></span>
                    </div>
                    <p className="mt-5 font-display text-3xl font-extrabold tracking-tight text-[#32103a]">{value}</p>
                    <p className="mt-1 text-xs text-slate-500">{detail}</p>
                  </Link>
                );
              })}
            </section>

            <section aria-label="Priority work" className="grid gap-5 lg:grid-cols-2">
              <article className="rounded-xl border border-[#eadfec] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div><h2 className="font-display text-lg font-bold text-[#32103a]">Follow-ups needing attention</h2><p className="mt-1 text-sm text-slate-500">Due today or overdue</p></div>
                  <Link to="/activities" aria-label="Open activities" className="grid size-10 place-items-center rounded-xl bg-[#f5edf6] text-[#7b3f8f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"><CalendarClock size={19} aria-hidden="true" /></Link>
                </div>
                {dueFollowUps.length === 0 ? <div className="mt-5 rounded-lg border border-dashed border-[#ddcfe0] bg-[#fcf9fc] px-4 py-7 text-center text-sm text-slate-500">No follow-ups due today.</div> : <ul className="mt-3 divide-y divide-[#f0e8f1]">{dueFollowUps.slice(0, 5).map((activity) => {
                  const date = activity.nextFollowUpDate ?? "";
                  const customer = customerNames.get(activity.customerId);
                  const lead = leadsById.get(activity.leadId);
                  const overdue = date < today;
                  return <li key={activity.activityId} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{customer ?? `Customer #${activity.customerId}`}</p><p className="mt-0.5 truncate text-xs text-slate-500">{activity.activityType?.trim() || "Follow-up"}{lead ? ` · ${lead.source || "Lead"} lead` : ` · Lead #${activity.leadId}`}</p></div><div className="shrink-0 text-right"><p className="text-xs font-medium text-slate-600">{formatDate(date)}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${overdue ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800"}`}>{overdue ? "Overdue" : "Due today"}</span></div></li>;
                })}</ul>}
                <Link to="/activities" className="mt-3 inline-flex text-sm font-semibold text-[#642068] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">Open activities</Link>
              </article>

              <article className="rounded-xl border border-[#eadfec] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div><h2 className="font-display text-lg font-bold text-[#32103a]">Upcoming test drives</h2><p className="mt-1 text-sm text-slate-500">Scheduled appointments in your worklist</p></div>
                  <Link to="/test-drives" aria-label="Open test drives" className="grid size-10 place-items-center rounded-xl bg-[#f5edf6] text-[#7b3f8f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"><ClipboardCheck size={19} aria-hidden="true" /></Link>
                </div>
                {upcomingTestDrives.length === 0 ? <div className="mt-5 rounded-lg border border-dashed border-[#ddcfe0] bg-[#fcf9fc] px-4 py-7 text-center text-sm text-slate-500">No upcoming test drives in your worklist.</div> : <ul className="mt-3 divide-y divide-[#f0e8f1]">{upcomingTestDrives.slice(0, 5).map((testDrive) => {
                  const vehicle = vehiclesById.get(testDrive.vehicleId);
                  return <li key={testDrive.testDriveId} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{customerNames.get(testDrive.customerId) ?? `Customer #${testDrive.customerId}`}</p><p className="mt-0.5 truncate text-xs text-slate-500">{vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : `Vehicle #${testDrive.vehicleId}`}</p></div><time className="shrink-0 text-right text-xs font-medium text-slate-600">{formatDateTime(testDrive.scheduledDateTime)}</time></li>;
                })}</ul>}
                <Link to="/test-drives" className="mt-3 inline-flex text-sm font-semibold text-[#642068] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">Open test drives</Link>
              </article>
            </section>

            <section aria-labelledby="recent-sales-title" className="rounded-xl border border-[#eadfec] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="recent-sales-title" className="font-display text-lg font-bold text-[#32103a]">Recent sales</h2><p className="mt-1 text-sm text-slate-500">Latest sale records available to you</p></div><Link to="/sales" className="text-sm font-semibold text-[#642068] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">Open sales</Link></div>
              {recentSales.length === 0 ? <div className="mt-5 rounded-lg border border-dashed border-[#ddcfe0] bg-[#fcf9fc] px-4 py-7 text-center text-sm text-slate-500">No sales have been recorded yet.</div> : <ul className="mt-3 divide-y divide-[#f0e8f1]">{recentSales.map((sale) => {
                const vehicle = vehiclesById.get(sale.vehicleId);
                return <li key={sale.saleId} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-5"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{customerNames.get(sale.customerId) ?? `Customer #${sale.customerId}`}</p><p className="mt-0.5 truncate text-xs text-slate-500">{vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : `Vehicle #${sale.vehicleId}`}</p></div><div className="text-xs text-slate-500">{formatDate(sale.saleDate)}</div><div className="flex items-center gap-2 sm:justify-end"><span className="font-semibold text-slate-800">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(sale.salePrice)}</span><span className="rounded-full bg-[#f5edf6] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#642068]">{sale.saleStatus}</span></div></li>;
              })}</ul>}
            </section>

            <nav aria-label="Quick actions" className="flex flex-wrap items-center gap-2 rounded-xl border border-[#eadfec] bg-white p-4 shadow-sm">
              <span className="mr-1 text-xs font-bold uppercase tracking-wide text-slate-500">Go to</span>
              {[{ label: "Inventory", href: "/vehicles" }, { label: "Leads", href: "/leads" }, { label: "Test Drives", href: "/test-drives" }, { label: "Sales", href: "/sales" }].map(({ label, href }) => <Link key={href} to={href} className="rounded-lg border border-[#eadfec] px-3 py-2 text-sm font-semibold text-[#54205d] transition hover:bg-[#f8f2f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">{label}</Link>)}
            </nav>
          </div>
        )}
      </div>
    </main>
  );
}
