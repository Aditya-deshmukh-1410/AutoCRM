import { useEffect, useMemo, useState } from "react";
import {
  Car, Check, ChevronDown, Clock, Gauge, IndianRupee, MapPin, MessageCircle, Phone, Search, Tag, User, XCircle,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import { api } from "../lib/siteApi";

const ago = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};
const avatarClasses = ["bg-violet-100", "bg-amber-100", "bg-emerald-100", "bg-sky-100"];
const avatarColor = (name: string) => `${avatarClasses[(name.charCodeAt(0) || 0) % avatarClasses.length]} text-slate-700`;
const day = (value: string) => new Date(value).toLocaleDateString();
const digits = (value: string) => value.replace(/\D/g, "");
const initials = (value: string) => value.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
const rupees = (value: number | null) => value == null ? "—" : `₹${new Intl.NumberFormat("en-IN").format(value)}`;
const when = (value: string) => new Date(value).toLocaleString();

type Row = {
  id: string; leadName: string; phone: string; email: string | null;
  carMake: string; carModel: string; carVariant: string | null; carYear: number; regMonth: number | null;
  ownerType: string | null; color: string | null; city: string | null; registrationNo: string | null;
  registrationAt: string | null; kmDriven: number | null; insuranceType: string | null; lifetimeTax: string | null;
  insuranceValidTill: string | null; accidental: boolean | null; floodAffected: boolean | null;
  expectedPrice: number | null; warranties: string | null; modifications: string | null; sellerNote: string | null;
  features: string | null; carCondition: string | null; status: string; createdAt: string;
};

const FLOW: [string, string][] = [["new", "New"], ["contacted", "Contacted"], ["offer_made", "Offer made"], ["purchased", "Purchased"]];
const TABS: [string, string][] = [["all", "All"], ...FLOW, ["rejected", "Rejected"]];
const PILL: Record<string, string> = {
  new: "border-amber-200 bg-amber-50 text-amber-700", contacted: "border-blue-200 bg-blue-50 text-blue-700",
  offer_made: "border-purple-200 bg-purple-50 text-purple-700", purchased: "border-green-200 bg-green-50 text-green-700",
  rejected: "border-slate-200 bg-slate-100 text-slate-500",
};
const LABEL: Record<string, string> = Object.fromEntries([...FLOW, ["rejected", "Rejected"]]);
const SCORE: Record<string, number> = { Excellent: 4, Good: 3, Fair: 2, Poor: 1 };
const RATING_CLS: Record<string, string> = {
  Excellent: "bg-green-100 text-green-700", Good: "bg-lime-100 text-lime-700",
  Fair: "bg-amber-100 text-amber-700", Poor: "bg-red-100 text-red-700",
};
const PAGE = 6;

function parse<T>(s: string | null, fallback: T): T {
  try { return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; }
}
const yn = (v: boolean | null) => (v == null ? "-" : v ? "Yes" : "No");

function condition(c: Record<string, string>) {
  const v = Object.values(c).map((x) => SCORE[x]).filter(Boolean);
  if (!v.length) return null;
  const avg = v.reduce((a, b) => a + b, 0) / v.length;
  const label = avg >= 3.5 ? "Excellent" : avg >= 2.5 ? "Good" : avg >= 1.5 ? "Fair" : "Poor";
  return { pct: Math.round((avg / 4) * 100), label };
}

function Stepper({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const idx = FLOW.findIndex(([v]) => v === status);
  return (
    <div className="flex items-center">
      {FLOW.map(([v, l], i) => {
        const done = idx >= i;
        return (
          <div key={v} className="flex items-center">
            <button onClick={() => onChange(v)} title={`Mark as ${l}`} className="flex flex-col items-center gap-1">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition ${done ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 text-slate-400 hover:border-brand-600"}`}>
                {done ? <Check size={14} /> : i + 1}
              </span>
              <span className={`text-[11px] ${idx === i ? "font-semibold text-brand-600" : "text-slate-400"}`}>{l}</span>
            </button>
            {i < FLOW.length - 1 && <span className={`mx-2 mb-4 h-0.5 w-6 sm:w-10 ${idx > i ? "bg-brand-600" : "bg-slate-200"}`} />}
          </div>
        );
      })}
    </div>
  );
}

export default function SellRequests() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);

  const load = () =>
    api<Row[]>("/api/crm/sell-requests").then(setRows).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const change = async (id: string, status: string) => {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, status } : r)));
    try { await api(`/api/crm/sell-requests/${id}/status`, { method: "PUT", body: { status } }); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update."); load(); }
  };

  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const openRows = rows.filter((r) => ["new", "contacted", "offer_made"].includes(r.status));
  const pipeline = openRows.reduce((a, r) => a + (r.expectedPrice ?? 0), 0);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) =>
      (tab === "all" || r.status === tab) &&
      (!needle || `${r.carMake} ${r.carModel} ${r.leadName} ${r.phone} ${r.city ?? ""}`.toLowerCase().includes(needle)));
  }, [rows, tab, q]);

  const stats = [
    { icon: Tag, label: "Total requests", value: rows.length, chip: `${count("purchased")} purchased`, cls: "bg-emerald-50 text-emerald-600" },
    { icon: Clock, label: "Needs action", value: count("new"), chip: count("new") ? "Not contacted" : "All clear", cls: count("new") ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600" },
    { icon: User, label: "In progress", value: count("contacted") + count("offer_made"), chip: `${count("offer_made")} offers made`, cls: "bg-purple-50 text-purple-600" },
    { icon: IndianRupee, label: "Open pipeline value", value: rupees(pipeline), chip: "Expected prices", cls: "bg-sky-50 text-sky-600" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Sell Requests"
        description="Website seller submissions appear here. Contact the seller, record an offer, and track the request through purchase." />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ icon: Icon, label, value, chip, cls }) => (
          <div key={label} className="rounded-2xl border border-black/10 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600/10 text-brand-600"><Icon size={18} /></div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>{chip}</span>
            </div>
            <p className="mt-4 text-sm text-slate-500">{label}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap rounded-lg bg-slate-100 p-1 text-sm">
          {TABS.map(([v, l]) => (
            <button key={v} onClick={() => { setTab(v); setShown(PAGE); }}
              className={`rounded-md px-3 py-1.5 font-medium ${tab === v ? "bg-white shadow" : "text-slate-500"}`}>
              {l} ({v === "all" ? rows.length : count(v)})
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} placeholder="Search car, seller, city…"
            className="w-64 rounded-lg border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-600" />
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {loading ? <p className="text-slate-500">Loading…</p>
          : list.length === 0 ? (
            <div className="rounded-2xl border border-black/10 bg-white p-12 text-center text-slate-500">
              <Car className="mx-auto text-slate-300" size={40} />
              <p className="mt-3">No sell requests here yet. They appear when visitors use the Sell Car page on your website.</p>
            </div>
          )
          : list.slice(0, shown).map((r) => {
            const features = parse<string[]>(r.features, []);
            const cond = parse<Record<string, string>>(r.carCondition, {});
            const score = condition(cond);
            const facts: [typeof Gauge, string][] = [
              [Gauge, r.kmDriven != null ? `${r.kmDriven.toLocaleString("en-IN")} km` : ""],
              [User, r.ownerType ? `${r.ownerType} owner` : ""],
              [MapPin, r.city ?? ""],
            ];
            const detail: [string, string][] = [
              ["Registration no", r.registrationNo ?? "-"], ["Registration at", r.registrationAt ?? "-"],
              ["Colour", r.color ?? "-"], ["Registered", r.regMonth ? `${r.regMonth}/${r.carYear}` : String(r.carYear)],
              ["Insurance", r.insuranceType ?? "-"], ["Insurance valid till", r.insuranceValidTill ? day(r.insuranceValidTill) : "-"],
              ["Life time tax", r.lifetimeTax ?? "-"], ["Accidental", yn(r.accidental)], ["Flood affected", yn(r.floodAffected)],
            ];
            const notes: [string, string | null][] = [
              ["Warranties", r.warranties], ["Modifications", r.modifications], ["Seller's note", r.sellerNote],
            ];
            return (
              <div key={r.id} className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
                <div className="flex flex-col gap-5 p-5 md:flex-row md:items-stretch">
                  <div className="relative flex h-28 w-full shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-plum-950 to-brand-600 text-white md:w-44">
                    <Car className="absolute -right-3 -bottom-3 text-white/10" size={90} strokeWidth={1} />
                    <p className="relative text-3xl font-extrabold">{r.carYear}</p>
                    <p className="relative text-sm font-medium text-white/80">{r.carMake}</p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold">{r.carMake} {r.carModel} {r.carVariant}</h3>
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PILL[r.status]}`}>{LABEL[r.status]}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {facts.filter(([, t]) => t).map(([Icon, t]) => (
                        <span key={t} className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                          <Icon size={13} />{t}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${avatarColor(r.leadName)}`}>{initials(r.leadName)}</div>
                      <div className="text-sm">
                        <p className="font-semibold">{r.leadName}</p>
                        <p className="text-xs text-slate-500">{r.phone} · {ago(r.createdAt)}</p>
                      </div>
                    </div>
                    {score && (
                      <div className="mt-3 max-w-xs">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Condition (seller rated)</span><span className="font-semibold text-slate-700">{score.label}</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-green-500" style={{ width: `${score.pct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 rounded-xl bg-slate-50 p-4 text-center md:w-44 md:text-right">
                    <p className="text-xs text-slate-500">Expected price</p>
                    <p className="text-2xl font-extrabold text-brand-600">{rupees(r.expectedPrice)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-black/10 bg-slate-50/70 px-5 py-4">
                  {r.status === "rejected" ? (
                    <p className="text-sm text-slate-500">This request was rejected.
                      <button onClick={() => change(r.id, "new")} className="ml-2 font-semibold text-brand-600">Reopen</button></p>
                  ) : <Stepper status={r.status} onChange={(s) => change(r.id, s)} />}

                  <div className="flex flex-wrap items-center gap-2">
                    <a href={`tel:${digits(r.phone)}`} className="flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm font-medium"><Phone size={14} /> Call</a>
                    <a href={`https://wa.me/${digits(r.phone)}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-green-700"><MessageCircle size={14} /> WhatsApp</a>
                    {r.status !== "rejected" && r.status !== "purchased" && (
                      <button onClick={() => change(r.id, "rejected")}
                        className="flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm text-slate-500 hover:text-red-600"><XCircle size={14} /> Reject</button>
                    )}
                    <button onClick={() => setOpen(open === r.id ? null : r.id)}
                      className="flex items-center gap-1 px-2 text-sm font-semibold text-brand-600">
                      {open === r.id ? "Hide details" : "View details"}
                      <ChevronDown size={16} className={`transition ${open === r.id ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>

                {open === r.id && (
                  <div className="space-y-6 border-t border-black/10 p-5">
                    <div>
                      <p className="text-sm font-semibold">Vehicle &amp; documents</p>
                      <dl className="mt-3 grid gap-x-8 text-sm sm:grid-cols-2 lg:grid-cols-3">
                        {detail.map(([l, v]) => (
                          <div key={l} className="flex justify-between border-b border-black/5 py-2">
                            <dt className="text-slate-500">{l}</dt><dd className="font-medium">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    {features.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold">Installed features</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {features.map((f) => (
                            <span key={f} className="flex items-center gap-1 rounded-full bg-brand-600/10 px-3 py-1 text-xs font-medium text-brand-700">
                              <Check size={12} />{f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {Object.keys(cond).length > 0 && (
                      <div>
                        <p className="text-sm font-semibold">Condition rated by the seller</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {Object.entries(cond).map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2 text-sm">
                              <span className="text-slate-600">{k}</span>
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${RATING_CLS[v] ?? "bg-slate-100"}`}>{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {notes.some(([, v]) => v) && (
                      <div className="grid gap-4 sm:grid-cols-3">
                        {notes.filter(([, v]) => v).map(([l, v]) => (
                          <div key={l} className="rounded-xl bg-slate-50 p-4">
                            <p className="text-sm font-semibold">{l}</p>
                            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{v}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-slate-400">Submitted {when(r.createdAt)}{r.email && ` · ${r.email}`}</p>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {!loading && list.length > shown && (
        <div className="mt-6 text-center">
          <button onClick={() => setShown(shown + PAGE)} className="rounded-lg border bg-white px-6 py-2.5 text-sm font-semibold">
            Show more ({list.length - shown} left)
          </button>
        </div>
      )}
    </div>
  );
}
