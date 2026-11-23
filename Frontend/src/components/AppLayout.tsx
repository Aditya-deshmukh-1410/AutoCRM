import type { ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Activity,
  CarFront,
  CircleDollarSign,
  ClipboardCheck,
  History,
  LayoutDashboard,
  LogOut,
  UserRound,
  UserCog,
  Users,
  Store,
  Globe,
  Bell,
  Tag,
} from "lucide-react";

type StoredUser = { email?: string; role?: string; tenantId?: number };

const navigationGroups = [
  { label: "Overview", items: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ] },
  { label: "Customer workflow", items: [
    { to: "/customers", label: "Customers", icon: Users },
    { to: "/leads", label: "Leads", icon: UserRound },
    { to: "/sell-requests", label: "Sell Requests", icon: Tag },
    { to: "/activities", label: "Activities", icon: Activity },
    { to: "/test-drives", label: "Test Drives", icon: ClipboardCheck },
    { to: "/notifications", label: "Notifications", icon: Bell },
  ] },
  { label: "Dealership", items: [
    { to: "/vehicles", label: "Inventory", icon: CarFront },
    { to: "/sales", label: "Sales", icon: CircleDollarSign },
    { to: "/finance", label: "Finance", icon: CircleDollarSign },
    { to: "/users", label: "Users & roles", icon: UserCog, adminOnly: true },
    { to: "/audit-history", label: "Audit History", icon: History, adminOnly: true },
    { to: "/dealership-profile", label: "Dealership Profile", icon: Store, adminOnly: true },
    { to: "/dealership-settings", label: "Dealership Settings", icon: UserCog, adminOnly: true },
    { to: "/website", label: "Website Builder", icon: Globe, adminOnly: true },
  ] },
];

const pageTitles: Record<string, string> = Object.fromEntries(
  navigationGroups.flatMap(({ items }) => items.map(({ to, label }) => [to, label]))
);

function readStoredUser(): StoredUser | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem("autocrm_user") ?? "null");
    if (typeof parsed === "object" && parsed !== null) {
      const user = parsed as Record<string, unknown>;
      return {
        email: typeof user.email === "string" ? user.email : undefined,
        role: typeof user.role === "string" ? user.role : undefined,
        tenantId: typeof user.tenantId === "number" ? user.tenantId : undefined,
      };
    }
  } catch {
    return null;
  }
  return null;
}

function AppNavigation({
  user,
  mobile = false,
}: {
  user: StoredUser | null;
  mobile?: boolean;
}) {
  const visibleGroups = navigationGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.adminOnly || user?.role?.toUpperCase() === "ADMIN"),
  })).filter((group) => group.items.length > 0);
  const items = visibleGroups.flatMap((group) => group.items);

  const link = ({ to, label, icon: Icon }: (typeof items)[number]) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/dashboard"}
          className={({ isActive }) => mobile
            ? `inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${isActive ? "bg-[#f5edf6] font-semibold text-[#54205d]" : "font-medium text-slate-600 hover:bg-[#f8f2f9] hover:text-[#54205d]"}`
            : `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${isActive ? "bg-white/15 font-semibold text-white shadow-[inset_3px_0_0_#c084fc]" : "font-medium text-white/65 hover:bg-white/10 hover:text-white"}`}
        >
          <Icon size={17} aria-hidden="true" />
          {label}
        </NavLink>
  );

  return mobile ? (
    <nav aria-label="CRM modules" className="flex gap-2 overflow-x-auto px-4 py-3 sm:px-6">
      {items.map((item) => <div key={item.to} className="shrink-0">{link(item)}</div>)}
    </nav>
  ) : (
    <nav aria-label="CRM modules" className="space-y-5">
      {visibleGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{group.label}</p>
          <div className="space-y-1">{group.items.map((item) => <div key={item.to}>{link(item)}</div>)}</div>
        </div>
      ))}
    </nav>
  );
}

export default function AppLayout({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = readStoredUser();
  const [dealershipName, setDealershipName] = useState("");
  const [dealershipLogo, setDealershipLogo] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    const loadBranding = async () => {
      const token = localStorage.getItem("autocrm_token");
      if (!token) return;
      try {
        const response = await fetch("/api/dealership-profile", { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) return;
        const profile = await response.json() as { name?: string; logoUrl?: string | null };
        if (!active) return;
        setDealershipName(profile.name ?? "");
        if (!profile.logoUrl) { setDealershipLogo(""); return; }
        const logoResponse = await fetch(`${profile.logoUrl}`, { headers: { Authorization: `Bearer ${token}` } });
        if (logoResponse.ok && active) {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          objectUrl = URL.createObjectURL(await logoResponse.blob());
          setDealershipLogo(objectUrl);
        }
      } catch { /* Branding remains optional if the profile request is unavailable. */ }
    };
    window.addEventListener("dealership-profile-updated", loadBranding);
    void loadBranding();
    return () => { active = false; window.removeEventListener("dealership-profile-updated", loadBranding); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, []);
  const title = location.pathname.startsWith("/vehicles/") ? "Vehicle Details" : pageTitles[location.pathname] ?? "AutoCRM";

  const logout = () => {
    localStorage.removeItem("autocrm_token");
    localStorage.removeItem("autocrm_user");
    navigate("/login", { replace: true });
  };

  return (
        <div className="min-h-screen bg-background text-slate-900 lg:flex">
      <aside className="hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-[#200024] px-5 py-7 text-white lg:sticky lg:top-0 lg:flex">
        <NavLink to="/dashboard" className="flex items-center gap-3 px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
          {dealershipLogo ? <img src={dealershipLogo} alt="" className="size-10 rounded-xl bg-white object-contain p-1" /> : <span className="grid size-10 place-items-center rounded-xl bg-white/10 text-brand-300"><Store size={20} aria-hidden="true" /></span>}
          <span><span className="block max-w-40 truncate font-display text-lg font-extrabold">{dealershipName || "AutoCRM"}</span><span className="block text-xs text-white/55">Dealership workspace</span></span>
        </NavLink>
        <p className="mb-3 mt-10 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Workspace</p>
        <AppNavigation user={user} />
        <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="truncate text-sm font-semibold">{user?.email ?? "Authenticated user"}</p>
          <p className="mt-1 text-xs capitalize text-white/55">{user?.role ?? "CRM workspace"}</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="crm-dashboard-topbar flex min-h-[72px] items-center justify-between border-b border-[#eadfec] bg-white px-4 py-3 sm:px-6 lg:px-10">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#54205d]">{dealershipName || "AutoCRM"} <span className="mx-1.5 text-slate-300">/</span>{title}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden rounded-full bg-[#f5edf6] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#642068] sm:inline-flex">{user?.role ?? "Account"}</span>
            <button onClick={logout} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#e7d9e9] px-3 text-sm font-semibold text-[#54205d] transition hover:bg-[#f8f2f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2">
              <LogOut size={16} aria-hidden="true" /><span>Log out</span>
            </button>
          </div>
        </header>
        <div className="border-b border-[#eadfec] bg-white lg:hidden"><AppNavigation user={user} mobile /></div>
        <div>{children ?? <Outlet />}</div>
      </div>
    </div>
  );
}
