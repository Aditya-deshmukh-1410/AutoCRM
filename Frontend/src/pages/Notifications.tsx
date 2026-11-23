import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CalendarCheck, CheckCheck, MessageSquare, Search, Tag } from "lucide-react";
import { api } from "../lib/siteApi";

const ago = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

type Item = {
  id: string; type: string; title: string; message: string | null; isRead: boolean; createdAt: string;
};
type Res = { items: Item[]; unread: number };

const META: Record<string, { icon: typeof Bell; tag: string; to: string; level: string; dot: string; text: string }> = {
  test_drive: { icon: CalendarCheck, tag: "Test drive", to: "test-drives", level: "URGENT", dot: "bg-red-500", text: "text-red-500" },
  sell_request: { icon: Tag, tag: "Sell request", to: "sell-requests", level: "HIGH", dot: "bg-amber-500", text: "text-amber-600" },
  enquiry: { icon: MessageSquare, tag: "Enquiry", to: "leads", level: "MEDIUM", dot: "bg-sky-500", text: "text-sky-600" },
};
const FALLBACK = { icon: Bell, tag: "System", to: "", level: "LOW", dot: "bg-slate-400", text: "text-slate-500" };
const TABS: [string, string][] = [
  ["all", "All"], ["unread", "Unread"], ["test_drive", "Test drives"], ["sell_request", "Sell requests"], ["enquiry", "Enquiries"],
];

export default function Notifications() {
  const nav = useNavigate();
  const [data, setData] = useState<Res>({ items: [], unread: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  const load = () =>
    api<Res>("/api/crm/notifications").then(setData).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const unreadOf = (t: string) => data.items.filter((n) => n.type === t && !n.isRead).length;

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.items.filter((n) =>
      (tab === "all" || (tab === "unread" ? !n.isRead : n.type === tab)) &&
      (!needle || `${n.title} ${n.message ?? ""}`.toLowerCase().includes(needle)));
  }, [data.items, tab, q]);

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    setData((d) => ({
      unread: Math.max(0, d.unread - d.items.filter((n) => ids.includes(n.id) && !n.isRead).length),
      items: d.items.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n)),
    }));
    try { await Promise.all(ids.map((id) => api(`/api/crm/notifications/${id}/read`, { method: "PUT" }))); }
    catch { load(); }
  };
  const readAll = async () => {
    try { await api("/api/crm/notifications/read-all", { method: "PUT" }); } catch { /* reloaded below */ }
    setPicked([]); load();
  };
  const open = (n: Item) => {
    if (!n.isRead) markRead([n.id]);
    const to = (META[n.type] ?? FALLBACK).to;
    if (to) nav(`/${to}`);
  };

  const allPicked = list.length > 0 && list.every((n) => picked.includes(n.id));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const stats = [
    { icon: Bell, label: "Unread", value: data.unread },
    { icon: CalendarCheck, label: "Test drive requests", value: unreadOf("test_drive") },
    { icon: Tag, label: "Sell requests", value: unreadOf("sell_request") },
    { icon: MessageSquare, label: "Enquiries", value: unreadOf("enquiry") },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Notification Center</h1>
          <p className="mt-1 text-slate-500">Manage your business leads and showroom activity from your website.</p>
        </div>
        <button onClick={readAll} disabled={data.unread === 0}
          className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
          <CheckCheck size={16} /> Mark all as read
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-4 rounded-2xl border border-black/10 bg-white p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600"><Icon size={22} /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="text-3xl font-bold">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mt-6 rounded-2xl border border-black/10 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 p-4">
          <div className="flex items-center gap-4">
            <input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? [] : list.map((n) => n.id))} title="Select all" />
            <div className="flex flex-wrap rounded-lg bg-slate-100 p-1 text-sm">
              {TABS.map(([v, l]) => (
                <button key={v} onClick={() => setTab(v)}
                  className={`rounded-md px-3 py-1.5 font-medium ${tab === v ? "bg-white shadow" : "text-slate-500"}`}>{l}</button>
              ))}
            </div>
            {picked.length > 0 && (
              <button onClick={() => { markRead(picked); setPicked([]); }} className="text-sm font-semibold text-brand-600">
                Mark {picked.length} as read
              </button>
            )}
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by client, car model…"
              className="w-64 rounded-lg border border-black/10 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-600" />
          </div>
        </div>

        {loading ? <p className="p-8 text-slate-500">Loading…</p>
          : list.length === 0 ? <p className="p-10 text-center text-slate-500">Nothing here yet. Website activity shows up here.</p>
          : list.map((n) => {
            const m = META[n.type] ?? FALLBACK;
            const Icon = m.icon;
            return (
              <div key={n.id} onClick={() => open(n)}
                className={`flex cursor-pointer items-start gap-4 border-b border-black/5 p-5 last:border-0 hover:bg-slate-50 ${n.isRead ? "" : "bg-brand-600/[0.04]"}`}>
                <div className="flex flex-col items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={picked.includes(n.id)} onChange={() => toggle(n.id)} />
                  {!n.isRead && <span className="h-2 w-2 rounded-full bg-brand-600" />}
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white text-brand-600"><Icon size={20} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={n.isRead ? "font-medium" : "font-bold"}>{n.title}</p>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">{m.tag}</span>
                  </div>
                  {n.message && <p className="mt-1 text-sm text-slate-600">{n.message}</p>}
                </div>
                <div className="shrink-0 text-right text-xs">
                  <p className={`flex items-center justify-end gap-1.5 font-bold ${m.text}`}>
                    <span className={`h-2 w-2 rounded-full ${m.dot}`} />{m.level}
                  </p>
                  <p className="mt-1.5 text-slate-400">{ago(n.createdAt)}</p>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
